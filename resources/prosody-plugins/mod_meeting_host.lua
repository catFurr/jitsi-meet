-- Meeting Host module
-- Assigns the first authenticated user joining a MUC room as the "Meeting Host".

local jid_bare = require "util.jid".bare;
local util = module:require "util";
local is_admin = util.is_admin;
local is_healthcheck_room = util.is_healthcheck_room;
local st = require "util.stanza"; -- Needed for error replies
local json = require "cjson.safe"; -- Needed for sending JSON messages
local timer = require "util.timer"; -- Needed for scheduling tasks

module:depends("system_chat"); -- Depend on the system chat module
local system_chat = module:require "system_chat"; -- Require the module

local SHUTDOWN_DELAY_SECONDS = module:get_option_number('meeting_host_leave_shutdown_delay', 300); -- Default 5 minutes

module:log('info', 'Loaded meeting host module on host: %s', module.host);

-- Hook into the pre-join event to identify and assign the first authenticated user as host.
-- Priority 1 ensures it runs relatively early, potentially before modules like mod_muc_allowners.
module:hook("muc-occupant-pre-join", function (event)
    local room, occupant, session = event.room, event.occupant, event.origin;

    -- Check if the joining user is the original host and a shutdown timer is active
    if room._data.meeting_host_jid == occupant.bare_jid and room._data.shutdown_timer then
        module:log('info', 'MeetingHost: Original host %s rejoining room %s. Cancelling shutdown timer.', occupant.bare_jid, room.jid);

        -- Cancel the timer
        timer.cancel_task(room._data.shutdown_timer);
        room._data.shutdown_timer = nil;

        -- Re-mark host as assigned
        room._data.meeting_host_assigned = true;

        -- Notify other participants that shutdown is cancelled
        local cancel_message = "The meeting host has rejoined. The scheduled shutdown has been cancelled.";
        -- Use system_chat module. Send from room JID for consistency.
        system_chat.send_room_notification(room, cancel_message, room.jid, "Meeting Host System");

        -- Allow the host to join normally (don't return true here unless blocking join for other reasons)
    end

    -- Skip health check rooms and system users (like focus)
    if is_healthcheck_room(room.jid) or is_admin(occupant.bare_jid) then
        module:log('debug', 'MeetingHost: Skipping host check for admin or health check room %s', room.jid);
        return;
    end

    -- Check if a host has already been assigned for this room
    if room._data.meeting_host_assigned then
        -- module:log('debug', 'MeetingHost: Host already assigned for room %s', room.jid);
        return;
    end

    -- Check if the joining user is authenticated (has a verified token)
    -- Note: mod_auth_token verifies the token *during* SASL authentication.
    -- By the time muc-occupant-pre-join runs for an authenticated user,
    -- session.auth_token should reflect a *valid* token was used.
    -- We check for its presence as an indicator of non-anonymous auth.
    if session and session.auth_token then
        local user_bare_jid = jid_bare(occupant.jid);

        module:log('info', 'MeetingHost: Assigning host %s for room %s', user_bare_jid, room.jid);

        -- Mark that a host has been assigned
        room._data.meeting_host_assigned = true;

        -- Store the host's bare JID
        room._data.meeting_host_jid = user_bare_jid;

        -- Explicitly set affiliation to owner (reason is optional but good for logs/history)
        -- This ensures the host has owner rights even if other modules modify affiliations.
        -- Use occupant.nick for the first argument as it refers to the full JID in the room context.
        room:set_affiliation(occupant.nick, user_bare_jid, "owner", "Assigned as Meeting Host");

    else
        -- module:log('debug', 'MeetingHost: User %s is not authenticated, not assigning host.', occupant.bare_jid);\
    end
end, 1); -- Run with priority 1

-- Hook into room destruction to clean up host data
module:hook("muc-room-destroyed", function (event)
    if event.room._data.meeting_host_jid then
        module:log('info', 'MeetingHost: Cleaning up host data for destroyed room %s', event.room.jid);
        event.room._data.meeting_host_assigned = nil;
        event.room._data.meeting_host_jid = nil;
        -- Also clean up the timer reference if it exists
        if event.room._data.shutdown_timer then
            module:log('info', 'MeetingHost: Cleaning up shutdown timer reference for destroyed room %s', event.room.jid);
            -- Cancel the timer if it's somehow still active (shouldn't be if destroy was called by it, but good practice)
            timer.cancel_task(event.room._data.shutdown_timer);
            event.room._data.shutdown_timer = nil;
        end
    end
end);

-- Hook into occupant leaving to handle host departure
module:hook("muc-occupant-leaving", function(event)
    local room, occupant = event.room, event.occupant;
    local leaving_bare_jid = jid_bare(occupant.jid);

    -- Check if the leaving occupant is the current host
    if is_meeting_host(room, leaving_bare_jid) then
        -- Host left, initiate shutdown sequence
        module:log('info', 'MeetingHost: Host %s left. Starting %d second shutdown timer for room %s.', leaving_bare_jid, SHUTDOWN_DELAY_SECONDS, room.jid);

        -- Mark room as host-less (pending shutdown)
        room._data.meeting_host_assigned = false;
        -- Keep room._data.meeting_host_jid to know original host

        -- Define the function to destroy the room
        local function destroy_room_callback()
            -- Check if the room still exists and if the timer wasn't cancelled
            -- Use a local variable to avoid issues if `room` reference changes somehow
            local current_room = get_room_from_jid(room.jid);
            if current_room and current_room._data and current_room._data.shutdown_timer then
                module:log('info', 'MeetingHost: Shutdown timer expired for room %s. Destroying room.', room.jid);
                -- Fire event for mod_room_destroy to handle actual destruction
                module:fire_event("maybe-destroy-room", {
                    room = current_room,
                    reason = "Meeting ended automatically after host left.",
                    caller = "mod_meeting_host"
                });
                -- No need to clear shutdown_timer here, room is gone
            else
                 module:log('info', 'MeetingHost: Shutdown timer callback executed for room %s, but room no longer exists or timer was cancelled.', room.jid);
            end
        end

        -- Schedule the room destruction
        room._data.shutdown_timer = timer.add_task(SHUTDOWN_DELAY_SECONDS, destroy_room_callback);

        -- Notify remaining participants
        local warning_message = string.format("The meeting host has left. The meeting will end automatically in %d minutes.", SHUTDOWN_DELAY_SECONDS / 60);
        -- Use system_chat module. Send from room JID.
        system_chat.send_room_notification(room, warning_message, room.jid, "Meeting Host System");
    end
end, 1); -- Priority 1

-- Helper function to check if a given user is the designated host for the room
function is_meeting_host(room, user_bare_jid)
    if not room or not user_bare_jid then
        return false;
    end
    return room._data.meeting_host_jid == user_bare_jid;
end

-- Add the helper function to the module's context so it can be called from other modules if needed
module:provides("meeting_host", {
    is_meeting_host = is_meeting_host;
});

-- Hook for handling custom JSON messages sent via endpoint-message
-- Used here for the "demote-moderator" action initiated by the host.
module:hook('jitsi-endpoint-message-received', function(event)
    local data, error, occupant, room, origin, stanza = event.message, event.error, event.occupant, event.room, event.origin, event.stanza;

    -- Check for errors or if it's not our message type
    if error or not data or data.type ~= 'meeting-host' then
        if error then module:log('error', 'MeetingHost: Error decoding endpoint message: %s', error); end
        return; -- Ignore message
    end

    -- Check if the sender is the meeting host
    if not is_meeting_host(room, occupant.bare_jid) then
        module:log('warn', 'MeetingHost: Received %s message from non-host %s in room %s', data.action or 'unknown', occupant.bare_jid, room.jid);
        -- Optionally send an error back to the sender?
        return true; -- Handled (ignored)
    end

    -- Handle demote-moderator action
    if data.action == 'demote-moderator' then
        local target_id = data.id; -- Expecting participant ID
        if not target_id then
            module:log('warn', 'MeetingHost: demote-moderator message missing target ID from %s', occupant.bare_jid);
            -- Send error back to host
            origin.send(st.error(stanza, "modify", "bad-request", "Missing target ID for demotion."));
            return true; -- Handled (bad request)
        end

        -- Find occupant by participant ID (usually part of the nick or stored in session)
        -- This is a simplified approach assuming ID is in the JID resource part.
        -- A more robust solution might involve searching occupant session data if ID is stored there.
        local target_occupant = nil;
        local target_nick = nil;
        for nick, occ in room:each_occupant() do
            -- Assuming the participant ID is the resource part of the JID
            -- JID format is typically: room@conference/nickname_participantId
            -- Or sometimes just room@conference/participantId
            -- We might need a more reliable way to map ID to occupant if this assumption is wrong.
            local _, _, resource = string.find(occ.jid, "^(.+)/(.+)$")
            -- Check if resource matches the ID directly or ends with _ID
            if resource and (resource == target_id or resource:match("^.+_"..target_id.."$")) then
                 target_occupant = occ;
                 target_nick = nick;
                 break;
             end
        end

        if not target_occupant then
            module:log('warn', 'MeetingHost: demote-moderator target with ID %s not found in room %s', target_id, room.jid);
            -- Send error back to host
            origin.send(st.error(stanza, "cancel", "item-not-found", "Target participant not found."));
            return true; -- Handled (target not found)
        end

        -- Prevent host from demoting themselves
        -- Compare IDs instead of bare JIDs for self-demotion check
        local _, _, sender_resource = string.find(occupant.jid, "^(.+)/(.+)$")
        if sender_resource and (sender_resource == target_id or sender_resource:match("^.+_"..target_id.."$")) then
             module:log('warn', 'MeetingHost: Host %s attempted to demote themselves.', occupant.bare_jid);
            -- Send error back to host
            origin.send(st.error(stanza, "modify", "not-allowed", "Cannot demote yourself."));
            return true; -- Handled (cannot demote self)
        end

        module:log('info', 'MeetingHost: Host %s demoting %s (ID: %s) in room %s', occupant.bare_jid, target_occupant.bare_jid, target_id, room.jid);

        -- Perform the demotion: Change affiliation and role
        -- Setting affiliation to 'member' might conflict with mod_muc_allowners if that runs later
        -- and re-promotes based on token. Setting role is usually safer for temporary status change.
        -- However, for persistent demotion, affiliation change is needed.
        -- Let's try setting affiliation to 'member' first.
        room:set_affiliation(target_nick, target_occupant.bare_jid, 'member', 'Demoted by Meeting Host');
        -- Also set role to participant ensure immediate presence update reflects the change
        room:set_role(target_occupant, 'participant', 'Demoted by Meeting Host');

        -- Send confirmation back to host? (Optional)
        -- Example: Send confirmation back to host
        origin.send(st.message({ to = occupant.jid, from = module.host, type = 'chat' })
            :tag('json-message', { xmlns = 'http://jitsi.org/jitmeet' })
            :text(json.encode({ type = 'meeting-host', action = 'demote-confirm', targetId = target_id }))
        );

        -- Send notification to the demoted user?
        -- Example: send_json_message(target_occupant.jid, json.encode({ type = 'meeting-host', action = 'demoted-notification', actor = occupant.bare_jid }))

        return true; -- Handled
    end

    -- Add other actions (like transfer-host via message if desired later)

    return; -- Not our action
end);
