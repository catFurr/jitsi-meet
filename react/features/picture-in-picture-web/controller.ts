import { IReduxState } from '../app/types';
import { getAvatarColor } from '../base/avatar/functions';
import JitsiMeetJS from '../base/lib-jitsi-meet/_';
import { getParticipantById } from '../base/participants/functions';
import { getVideoTrackByParticipant } from '../base/tracks/functions.any';
import { getLargeVideoParticipant } from '../large-video/functions';

type GetState = () => IReduxState;

class WebPipController {
    private canvas?: HTMLCanvasElement;
    private ctx?: CanvasRenderingContext2D | null;
    private hiddenVideo?: HTMLVideoElement;
    private animationHandle?: number;
    private intervalHandle?: number;
    private running = false;
    private lastAudioLevel = 0;
    private audioTrackListenerBound = false;
    private currentParticipantId?: string;

    public isSupported(): boolean {
        const anyDoc: any = document as any;

        return Boolean((document as any).pictureInPictureEnabled || anyDoc.webkitSupportsPresentationMode);
    }

    public async enter(getState: GetState) {
        if (this.running) {
            return;
        }

        this.running = true;
        this.ensureElements();

        // Kick off draw loop bound to large video visuals.
        // Use setInterval to avoid full rAF throttling on background tabs.
        const draw = () => {
            if (!this.running) {
                return;
            }
            this.drawFrame(getState);
        };

        this.intervalHandle = window.setInterval(draw, Math.floor(1000 / 24));

        // Pipe canvas into hidden video and request PiP.
        const stream = this.canvas!.captureStream(24);

        this.hiddenVideo!.srcObject = stream;
        this.hiddenVideo!.muted = true;
        await this.hiddenVideo!.play();

        const anyVid: any = this.hiddenVideo as any;

        if (this.hiddenVideo?.requestPictureInPicture) {
            await this.hiddenVideo!.requestPictureInPicture();
        } else if (anyVid.webkitSetPresentationMode) {
            anyVid.webkitSetPresentationMode('picture-in-picture');
        }

        document.addEventListener('leavepictureinpicture', this.onLeavePiP);
    }

    public async exit() {
        if (!this.running) {
            return;
        }
        this.running = false;
        if (this.animationHandle) {
            cancelAnimationFrame(this.animationHandle);
            this.animationHandle = undefined;
        }
        if (this.intervalHandle) {
            clearInterval(this.intervalHandle);
            this.intervalHandle = undefined;
        }
        document.removeEventListener('leavepictureinpicture', this.onLeavePiP);
        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
            }
        } catch {
            // ignore
        }
        // Stop tracks
        const ms = this.hiddenVideo?.srcObject as MediaStream | undefined;

        ms?.getTracks().forEach(t => t.stop());
        if (this.hiddenVideo) {
            this.hiddenVideo.srcObject = null;
        }

        // Detach audio level listener if attached
        if (this.audioTrackListenerBound) {
            this.detachAudioLevelListener();
        }
    }

    private onLeavePiP = () => {
        // cleanup handled by actions; keep minimal here
    };

    private ensureElements() {
        if (!this.canvas) {
            this.canvas = document.createElement('canvas');
            // Default 1280x720; it will be scaled by browser in PiP.
            this.canvas.width = 1280;
            this.canvas.height = 720;
            this.ctx = this.canvas.getContext('2d');
        }
        if (!this.hiddenVideo) {
            this.hiddenVideo = document.createElement('video');
            this.hiddenVideo.setAttribute('playsinline', 'true');
            this.hiddenVideo.style.position = 'fixed';
            this.hiddenVideo.style.left = '-10000px';
            this.hiddenVideo.style.top = '-10000px';
            this.hiddenVideo.muted = true;
            document.body.appendChild(this.hiddenVideo);
        }
    }

    private drawFrame(getState: GetState) {
        const state = getState();
        const participant = getLargeVideoParticipant(state);
        const canvas = this.canvas!;
        const ctx = this.ctx!;

        // Clear
        ctx.fillStyle = '#0E0E10';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (!participant) {
            return;
        }

        const track = getVideoTrackByParticipant(state, participant);

        // If participant changed, (re)bind audio level listener
        if (participant.id !== this.currentParticipantId) {
            this.currentParticipantId = participant.id;
            this.bindAudioLevelListener(state, participant.id);
        }

        if (track?.jitsiTrack) {
            // Draw from the already-rendered stage video element if possible, to avoid extra decoder costs.
            const stageVideo = document.getElementById('largeVideo') as HTMLVideoElement | null;

            if (stageVideo && stageVideo.readyState >= 2) {
                // Letterbox into canvas
                this.drawVideoContain(stageVideo, ctx, canvas.width, canvas.height);

                return;
            }
        }

        // Fallback: avatar/initials + pulsing ring per audio level
        this.drawAvatarWithPulse(ctx, canvas.width, canvas.height, participant.id, state);
    }

    private drawVideoContain(video: HTMLVideoElement, ctx: CanvasRenderingContext2D, cw: number, ch: number) {
        const vw = video.videoWidth || 1;
        const vh = video.videoHeight || 1;
        const scale = Math.min(cw / vw, ch / vh);
        const dw = vw * scale;
        const dh = vh * scale;
        const dx = (cw - dw) / 2;
        const dy = (ch - dh) / 2;

        ctx.drawImage(video, dx, dy, dw, dh);
    }

    private drawAvatarWithPulse(
            ctx: CanvasRenderingContext2D,
            cw: number,
            ch: number,
            participantId: string,
            state: IReduxState
    ) {
        // Colors resemble stage glow theme
        const innerColor = 'rgba(68,165,255,0.9)';
        const outerColor = 'rgba(68,165,255,0.35)';

        // Compute audio level for glow sizing if available via APP or tracks map
        // For MVP, softly oscillate the pulse with lastAudioLevel placeholder.
        const level = this.lastAudioLevel;
        const baseRadius = Math.min(cw, ch) * 0.18;
        const centerX = cw / 2;
        const centerY = ch / 2;

        // Outer ring
        const outerRadius = baseRadius + baseRadius * 0.6 * level;

        ctx.beginPath();
        const gradOuter = ctx.createRadialGradient(centerX, centerY, baseRadius, centerX, centerY, outerRadius);

        gradOuter.addColorStop(0, outerColor);
        gradOuter.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gradOuter;
        ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
        ctx.fill();

        // Inner circle (avatar background)
        ctx.beginPath();
        const participant = getParticipantById(state, participantId);
        const initialsText = (participant?.name || '').trim();
        const initialsOnly = initialsText
            .split(/\s+/)
            .map(s => s[0])
            .join('')
            .toUpperCase()
            .slice(0, 2) || '?';
        const customAvatarBackgrounds = state['features/base/config'].customAvatarBackgrounds || [];
        const bgColor = getAvatarColor(initialsOnly, customAvatarBackgrounds);

        ctx.fillStyle = bgColor || '#22242A';
        ctx.arc(centerX, centerY, baseRadius, 0, Math.PI * 2);
        ctx.fill();

        // Initials (match StatelessAvatar weighting)
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `${Math.floor(baseRadius * 0.9)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(initialsOnly, centerX, centerY + 4);
    }

    private bindAudioLevelListener(state: IReduxState, participantId: string) {
        this.detachAudioLevelListener();
        const tracks = state['features/base/tracks'];
        const audioTrack = tracks.find(t => t.participantId === participantId && t.mediaType === 'audio');
        const jitsiTrack = audioTrack?.jitsiTrack;
        const JitsiTrackEvents = (JitsiMeetJS as any).events?.track;

        if (!jitsiTrack || !JitsiTrackEvents) {
            this.audioTrackListenerBound = false;
            this.lastAudioLevel = 0;

            return;
        }
        const onLevel = (lvl: number) => {
            if (typeof lvl === 'number' && !isNaN(lvl)) {
                // Sensitivity/scale similar to AudioLevelIndicator
                const scaled = Math.min(lvl * 1.2, 1);

                this.lastAudioLevel = scaled;
            }
        };

        // @ts-ignore
        jitsiTrack.on(JitsiTrackEvents.TRACK_AUDIO_LEVEL_CHANGED, onLevel);
        // Stash teardown on the jitsiTrack for simplicity.
        // @ts-ignore
        (this as any)._currentAudioBinding = { jitsiTrack, JitsiTrackEvents, onLevel };
        this.audioTrackListenerBound = true;
    }

    private detachAudioLevelListener() {
        // @ts-ignore
        const binding = (this as any)._currentAudioBinding;

        if (binding) {
            const { jitsiTrack, JitsiTrackEvents, onLevel } = binding;

            try {
                jitsiTrack.off(JitsiTrackEvents.TRACK_AUDIO_LEVEL_CHANGED, onLevel);
            } catch {
                // ignore
            }
        }
        // @ts-ignore
        (this as any)._currentAudioBinding = undefined;
        this.audioTrackListenerBound = false;
        this.lastAudioLevel = 0;
    }
}

export default new WebPipController();
