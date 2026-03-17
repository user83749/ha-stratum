<script lang="ts">
	// ── CameraMoreInfo ────────────────────────────────────────────────────────

	import { untrack } from 'svelte';
	import { browser } from '$app/environment';
	import { optimisticEntities } from '$lib/ha/optimistic';
	import { connection, entities as liveEntities } from '$lib/ha/websocket';
	import { configStore } from '$lib/stores/config';
	import type { Tile, CameraFeedConfig } from '$lib/types/dashboard';
	import { haptic } from '$lib/utils/haptics';
	import Icon from '$lib/components/ui/Icon.svelte';
	import type Hls from 'hls.js';

	// ── Props ─────────────────────────────────────────────────────────────
	interface Props {
		entityId: string;
		tile?: Tile | null;
	}
	const { entityId, tile = null }: Props = $props();
	const entity = $derived($optimisticEntities[entityId] ?? null);
	const stateLabel = $derived((entity?.state as string | undefined) ?? 'unknown');

	// ── Types ─────────────────────────────────────────────────────────────
	interface ResolvedCameraFeed {
		id: string;
		label: string;
		sourceType: 'entity' | 'url';
		entityId: string | null;
		url?: string;
	}

	interface HaConnection {
		sendMessagePromise<T = unknown>(message: Record<string, unknown>): Promise<T>;
		subscribeMessage<T = unknown>(
			callback: (result: T) => void,
			subscribeMessage: Record<string, unknown>,
			options?: { resubscribe?: boolean; preCheck?: () => boolean | Promise<boolean> }
		): Promise<() => Promise<void>>;
	}

	type StreamType = 'hls' | 'web_rtc';
	interface CameraCapabilities {
		frontend_stream_types?: StreamType[];
	}
	type WebRtcOfferEvent =
		| { type: 'session'; session_id: string }
		| { type: 'answer'; answer: string }
		| { type: 'candidate'; candidate: RTCIceCandidateInit }
		| { type: 'error'; code: string; message: string };
	interface WebRtcClientConfiguration {
		configuration?: RTCConfiguration;
	}

	// ── Feed Resolution ────────────────────────────────────────────────────
	const feeds = $derived.by<ResolvedCameraFeed[]>(() => {
		const configured = ((tile?.config.camera_feeds as CameraFeedConfig[] | undefined) ?? [])
			.filter((feed) => !!feed && typeof feed.id === 'string' && feed.id.length > 0);

		const resolved = configured.map((feed) => {
			if (feed.type === 'url') {
				return {
					id: feed.id,
					label: feed.label?.trim() || 'Custom feed',
					sourceType: 'url' as const,
					entityId: null,
					url: feed.url?.trim() || ''
				};
			}
			const sourceEntityId = feed.entity_id?.trim() || entityId;
			return {
				id: feed.id,
				label: feed.label?.trim() || sourceEntityId,
				sourceType: 'entity' as const,
				entityId: sourceEntityId
			};
		});

		if (resolved.length > 0) return resolved;

		return [{
			id: '__default',
			label: 'Camera',
			sourceType: 'entity' as const,
			entityId
		}];
	});

	// ── Active Feed ────────────────────────────────────────────────────────
	const primaryFeedId = $derived.by(() => {
		const configuredPrimary = tile?.config.camera_primary_feed as string | undefined;
		return feeds.some((f) => f.id === configuredPrimary)
			? configuredPrimary!
			: (feeds[0]?.id ?? '');
	});

	let userSelectedFeedId = $state('');

	const activeFeedId = $derived.by(() => {
		if (userSelectedFeedId && feeds.some((f) => f.id === userSelectedFeedId)) {
			return userSelectedFeedId;
		}
		return primaryFeedId || feeds[0]?.id || '';
	});

	const activeFeed = $derived(feeds.find((f) => f.id === activeFeedId) ?? null);
	const configuredHassUrl = $derived(String($configStore.hassUrl ?? '').trim().replace(/\/+$/, ''));

	const orderedFeeds = $derived.by(() => {
		if (!activeFeedId) return feeds;
		const index = feeds.findIndex((f) => f.id === activeFeedId);
		if (index <= 0) return feeds;
		const next = [...feeds];
		const [primary] = next.splice(index, 1);
		next.unshift(primary);
		return next;
	});

	// ── URL Helpers ────────────────────────────────────────────────────────
	function absolutizeUrl(url: string): string {
		if (!url) return '';
		if (/^https?:\/\//i.test(url)) return url;

		// Keep relative URLs relative in ingress, so they resolve against the
		// ingress origin/prefix instead of a standalone HA base URL.
		if (
			browser &&
			/^\/api\/hassio_ingress\/[^/]+/.test(window.location.pathname)
		) {
			return url;
		}

		if (configuredHassUrl) {
			return `${configuredHassUrl}${url.startsWith('/') ? '' : '/'}${url}`;
		}
		return url; // leave relative — browser resolves against current origin
	}

	// ── Stream State ──────────────────────────────────────────────────────
	type StreamState =
		| { status: 'loading' }
		| { status: 'ready' }
		| { status: 'error'; message: string };

	const STREAM_TIMEOUT_MS = 15000;

	let streamStateByFeed = $state<Record<string, StreamState>>({});
	let hlsInstance: InstanceType<typeof Hls> | null = null;
	let peerConnection: RTCPeerConnection | null = null;
	let webRtcUnsubscribe: (() => Promise<void>) | null = null;
	let videoEl = $state<HTMLVideoElement | null>(null);
	let proxyImgEl = $state<HTMLImageElement | null>(null);
	let activeStreamFeedId = '';
	let attachedVideoEl: HTMLVideoElement | null = null;
	let activeMediaMode = $state<'video' | 'proxy'>('video');
	let activeProxyUrl = $state('');
	let activeProxyFeedId = $state('');
	let proxyStartupTimer: ReturnType<typeof setTimeout> | null = null;

	function clearProxyStartupTimer() {
		if (proxyStartupTimer) {
			clearTimeout(proxyStartupTimer);
			proxyStartupTimer = null;
		}
	}

	function setFeedStreamState(feedId: string, next: StreamState) {
		const prev = streamStateByFeed[feedId];
		if (
			prev &&
			prev.status === next.status &&
			(prev.status !== 'error' || (next.status === 'error' && prev.message === next.message))
		) return;
		streamStateByFeed = { ...streamStateByFeed, [feedId]: next };
	}

	async function playAndMarkReady(feedId: string, el: HTMLVideoElement, signal: { cancelled: boolean }): Promise<void> {
		try {
			await el.play();
			if (signal.cancelled) return;
			setFeedStreamState(feedId, { status: 'ready' });
		} catch (error: unknown) {
			if (signal.cancelled) return;
			const message = error instanceof Error ? error.message : String(error);
			setFeedStreamState(feedId, { status: 'error', message: `Playback failed: ${message}` });
			throw error instanceof Error ? error : new Error(message);
		}
	}

	function teardown() {
		if (webRtcUnsubscribe) {
			void webRtcUnsubscribe().catch(() => {});
			webRtcUnsubscribe = null;
		}
		if (hlsInstance) {
			hlsInstance.destroy();
			hlsInstance = null;
		}
		if (peerConnection) {
			peerConnection.close();
			peerConnection = null;
		}
		if (videoEl) {
			videoEl.pause();
			videoEl.srcObject = null;
			videoEl.src = '';
			videoEl.load();
		}
		if (proxyImgEl) {
			proxyImgEl.src = '';
		}
		clearProxyStartupTimer();
		activeMediaMode = 'video';
		activeProxyUrl = '';
		activeProxyFeedId = '';
	}

	// ── WebRTC ────────────────────────────────────────────────────────────
	async function startWebRtc(
		feed: ResolvedCameraFeed,
		el: HTMLVideoElement,
		signal: { cancelled: boolean },
		conn: HaConnection
	): Promise<void> {
		let rtcConfig: RTCConfiguration | undefined;
		try {
			const config = await conn.sendMessagePromise<WebRtcClientConfiguration>({
				type: 'camera/webrtc/get_client_config',
				entity_id: feed.entityId!
			});
			rtcConfig = config?.configuration;
		} catch {
			rtcConfig = undefined;
		}

		const pc = new RTCPeerConnection(rtcConfig);
		peerConnection = pc;

		pc.createDataChannel('dataSendChannel');
		pc.addTransceiver('audio', { direction: 'recvonly' });
		pc.addTransceiver('video', { direction: 'recvonly' });
		const remoteStream = new MediaStream();
		let settled = false;
		let sessionId: string | null = null;
		const queuedLocalCandidates: RTCIceCandidateInit[] = [];
		const queuedRemoteCandidates: RTCIceCandidateInit[] = [];
		let remoteDescriptionSet = false;
		let onConnectionStateChange: (() => void) | null = null;
		let onTrack: ((event: RTCTrackEvent) => void) | null = null;
		let onIceCandidate: ((event: RTCPeerConnectionIceEvent) => void) | null = null;

		const result = await new Promise<void>((resolve, reject) => {
			const cleanup = () => {
				if (onConnectionStateChange) {
					pc.removeEventListener('connectionstatechange', onConnectionStateChange);
					onConnectionStateChange = null;
				}
				if (onTrack) {
					pc.removeEventListener('track', onTrack);
					onTrack = null;
				}
				if (onIceCandidate) {
					pc.removeEventListener('icecandidate', onIceCandidate);
					onIceCandidate = null;
				}
				if (webRtcUnsubscribe) {
					void webRtcUnsubscribe().catch(() => {});
					webRtcUnsubscribe = null;
				}
			};
				const fail = (reason: string) => {
					if (settled) {
						teardown();
						setFeedStreamState(feed.id, { status: 'error', message: reason });
						return;
					}
					settled = true;
					clearTimeout(timer);
					cleanup();
					reject(new Error(reason));
				};
			const succeed = () => {
				if (settled) return;
				settled = true;
				clearTimeout(timer);
				resolve();
			};
			const sendCandidate = async (candidate: RTCIceCandidateInit) => {
				if (!sessionId || signal.cancelled) return;
				await conn.sendMessagePromise({
					type: 'camera/webrtc/candidate',
					entity_id: feed.entityId!,
					session_id: sessionId,
					candidate
				});
			};
			const flushCandidates = async () => {
				if (!sessionId || queuedLocalCandidates.length === 0) return;
				while (queuedLocalCandidates.length > 0) {
					const candidate = queuedLocalCandidates.shift();
					if (!candidate) continue;
					try {
						await sendCandidate(candidate);
					} catch (error: unknown) {
						fail(
							`WebRTC candidate send failed: ${
								error instanceof Error ? error.message : String(error)
							}`
						);
						return;
					}
				}
			};
			const flushRemoteCandidates = async () => {
				if (!remoteDescriptionSet || queuedRemoteCandidates.length === 0) return;
				while (queuedRemoteCandidates.length > 0) {
					const candidate = queuedRemoteCandidates.shift();
					if (!candidate) continue;
					try {
						await pc.addIceCandidate(candidate);
					} catch (error: unknown) {
						fail(
							`WebRTC remote candidate failed: ${
								error instanceof Error ? error.message : String(error)
							}`
						);
						return;
					}
				}
			};

				const timer = setTimeout(() => fail('WebRTC track timeout'), STREAM_TIMEOUT_MS);
				onConnectionStateChange = () => {
					if (signal.cancelled) return;
					if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
						fail(`WebRTC ${pc.connectionState}`);
					}
				};
			onTrack = (event: RTCTrackEvent) => {
				if (event.track.kind !== 'video') return;
				remoteStream.addTrack(event.track);
				el.srcObject = remoteStream;
				playAndMarkReady(feed.id, el, signal)
					.then(() => {
						succeed();
					})
					.catch((err) => {
						fail(err instanceof Error ? err.message : String(err));
					});
			};
			onIceCandidate = (event: RTCPeerConnectionIceEvent) => {
				if (signal.cancelled || !event.candidate) return;
				const candidate = event.candidate.toJSON();
				if (!sessionId) {
					queuedLocalCandidates.push(candidate);
					return;
				}
				void sendCandidate(candidate).catch((error) => {
					fail(
						`WebRTC candidate send failed: ${
							error instanceof Error ? error.message : String(error)
						}`
					);
				});
			};
			pc.addEventListener('connectionstatechange', onConnectionStateChange);
			pc.addEventListener('track', onTrack);
			pc.addEventListener('icecandidate', onIceCandidate);

			void (async () => {
				const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
				await pc.setLocalDescription(offer);
				if (signal.cancelled) {
					fail('cancelled');
					return;
				}

				try {
					webRtcUnsubscribe = await conn.subscribeMessage<WebRtcOfferEvent>(
						(event) => {
							if (signal.cancelled || settled) return;
							if (event.type === 'session') {
								sessionId = event.session_id;
								void flushCandidates();
								return;
							}
							if (event.type === 'answer') {
								void pc.setRemoteDescription(
									new RTCSessionDescription({ type: 'answer', sdp: event.answer })
								)
									.then(() => {
										remoteDescriptionSet = true;
										void flushRemoteCandidates();
									})
									.catch((error) => {
										fail(
											`WebRTC remote description failed: ${
												error instanceof Error ? error.message : String(error)
											}`
										);
									});
								return;
							}
							if (event.type === 'candidate') {
								if (!remoteDescriptionSet) {
									queuedRemoteCandidates.push(event.candidate);
									return;
								}
								void pc.addIceCandidate(event.candidate).catch((error) => {
									fail(
										`WebRTC remote candidate failed: ${
											error instanceof Error ? error.message : String(error)
										}`
									);
								});
								return;
							}
							if (event.type === 'error') {
								fail(`WebRTC ${event.code}: ${event.message}`);
							}
						},
						{
							type: 'camera/webrtc/offer',
							entity_id: feed.entityId!,
							offer: offer.sdp ?? ''
						}
					);
				} catch (error: unknown) {
					fail(`WebRTC subscribe failed: ${error instanceof Error ? error.message : String(error)}`);
				}
			})().catch((error: unknown) => {
				fail(`WebRTC setup failed: ${error instanceof Error ? error.message : String(error)}`);
			});
		});

		if (signal.cancelled) {
			pc.close();
			peerConnection = null;
			return;
		}
		return result;
	}

	// ── HLS ───────────────────────────────────────────────────────────────
	async function startHls(
		feed: ResolvedCameraFeed,
		el: HTMLVideoElement,
		signal: { cancelled: boolean },
		conn: HaConnection
	): Promise<void> {
		const response = await conn.sendMessagePromise<{ url: string }>({
			type: 'camera/stream',
			entity_id: feed.entityId!
		});

		if (signal.cancelled) return;

		const url = absolutizeUrl(response.url);
		if (!url) throw new Error('No URL returned');

		const { default: HlsLib } = await import('hls.js');
		if (signal.cancelled) return;

		if (HlsLib.isSupported()) {
			hlsInstance = new HlsLib({
				backBufferLength: 60,
				fragLoadingTimeOut: 30000,
				manifestLoadingTimeOut: 30000,
				levelLoadingTimeOut: 30000,
				maxLiveSyncPlaybackRate: 2,
				lowLatencyMode: true
			});
			hlsInstance.loadSource(url);
			hlsInstance.attachMedia(el);

			// wait for manifest with timeout
			await new Promise<void>((resolve, reject) => {
				let settled = false;
				const timer = setTimeout(() => fail('HLS manifest timeout'), STREAM_TIMEOUT_MS);
				const cleanup = () => {
					clearTimeout(timer);
					hlsInstance?.off(HlsLib.Events.MANIFEST_PARSED, onParsed);
					hlsInstance?.off(HlsLib.Events.ERROR, onStartupError);
				};
				const succeed = () => {
					if (settled) return;
					settled = true;
					cleanup();
					resolve();
				};
				const fail = (reason: string) => {
					if (settled) return;
					settled = true;
					cleanup();
					reject(new Error(reason));
				};
				const onParsed = () => {
					if (signal.cancelled) return;
					playAndMarkReady(feed.id, el, signal)
						.then(() => succeed())
						.catch((err) => fail(err instanceof Error ? err.message : String(err)));
				};
				const onStartupError = (_event: string, data: { fatal: boolean; type?: string }) => {
					if (signal.cancelled) return;
					if (!data.fatal) return;
					fail(data.type ? `HLS ${data.type}` : 'HLS startup fatal error');
				};
				hlsInstance!.on(HlsLib.Events.MANIFEST_PARSED, onParsed);
				hlsInstance!.on(HlsLib.Events.ERROR, onStartupError);
			});

			// post-start fatal error handler
			hlsInstance.on(HlsLib.Events.ERROR, (_event, data) => {
				if (signal.cancelled) return;
				if (data.fatal) {
					switch (data.type) {
						case HlsLib.ErrorTypes.MEDIA_ERROR:
							hlsInstance?.recoverMediaError();
							break;
						case HlsLib.ErrorTypes.NETWORK_ERROR:
							teardown();
							setFeedStreamState(feed.id, { status: 'error', message: 'Network error.' });
							break;
						default:
							teardown();
							setFeedStreamState(feed.id, { status: 'error', message: 'Stream error.' });
							break;
					}
				}
			});

		} else if (el.canPlayType('application/vnd.apple.mpegurl')) {
			// Safari native HLS — with timeout and error handling
			el.src = url;
			await new Promise<void>((resolve, reject) => {
				const timer = setTimeout(() => {
					cleanup();
					reject(new Error('Native HLS timeout'));
				}, STREAM_TIMEOUT_MS);
				const onLoaded = () => {
					cleanup();
					if (signal.cancelled) return;
					playAndMarkReady(feed.id, el, signal)
						.then(() => resolve())
						.catch((err) => reject(err));
				};
				const onError = () => {
					cleanup();
					reject(new Error('Native HLS playback error'));
				};
				const cleanup = () => {
					clearTimeout(timer);
					el.removeEventListener('loadedmetadata', onLoaded);
					el.removeEventListener('error', onError);
				};
				el.addEventListener('loadedmetadata', onLoaded, { once: true });
				el.addEventListener('error', onError, { once: true });
			});
		} else {
			setFeedStreamState(feed.id, { status: 'error', message: 'HLS not supported in this browser.' });
		}
	}

	// ── Direct URL ─────────────────────────────────────────────────────────
	async function startDirectUrl(
		feed: ResolvedCameraFeed,
		el: HTMLVideoElement,
		signal: { cancelled: boolean },
		rawUrl: string
	): Promise<void> {
		const url = absolutizeUrl(rawUrl);
		if (!url) throw new Error('No URL provided');

		// Prefer hls.js for m3u8 URLs on non-Safari browsers.
		if (/\.m3u8(\?|$)/i.test(url)) {
			const { default: HlsLib } = await import('hls.js');
			if (signal.cancelled) return;

			if (HlsLib.isSupported()) {
				hlsInstance = new HlsLib({
					backBufferLength: 60,
					fragLoadingTimeOut: 30000,
					manifestLoadingTimeOut: 30000,
					levelLoadingTimeOut: 30000,
					maxLiveSyncPlaybackRate: 2,
					lowLatencyMode: true
				});
				hlsInstance.loadSource(url);
				hlsInstance.attachMedia(el);
				await new Promise<void>((resolve, reject) => {
					const timer = setTimeout(() => reject(new Error('HLS manifest timeout')), STREAM_TIMEOUT_MS);
					const cleanup = () => {
						clearTimeout(timer);
						hlsInstance?.off(HlsLib.Events.MANIFEST_PARSED, onParsed);
						hlsInstance?.off(HlsLib.Events.ERROR, onErr);
					};
					const onParsed = () => {
						cleanup();
						if (signal.cancelled) return;
							playAndMarkReady(feed.id, el, signal)
								.then(() => resolve())
								.catch((err) => reject(err));
					};
					const onErr = (_event: string, data: { fatal: boolean; type?: string }) => {
						if (!data.fatal) return;
						cleanup();
						reject(new Error(data.type ? `HLS ${data.type}` : 'HLS stream error'));
					};
					hlsInstance?.on(HlsLib.Events.MANIFEST_PARSED, onParsed);
					hlsInstance?.on(HlsLib.Events.ERROR, onErr);
				});
				return;
			}
		}

		// Fallback: direct video URL.
		el.src = url;
		await new Promise<void>((resolve, reject) => {
			const timer = setTimeout(() => {
				cleanup();
				reject(new Error('Direct URL timeout'));
			}, STREAM_TIMEOUT_MS);
			const onLoaded = () => {
				cleanup();
				if (signal.cancelled) return;
				playAndMarkReady(feed.id, el, signal)
					.then(() => resolve())
					.catch((err) => reject(err));
			};
			const onErr = () => {
				cleanup();
				reject(new Error('Direct URL playback error'));
			};
			const cleanup = () => {
				clearTimeout(timer);
				el.removeEventListener('loadedmetadata', onLoaded);
				el.removeEventListener('error', onErr);
			};
			el.addEventListener('loadedmetadata', onLoaded, { once: true });
			el.addEventListener('error', onErr, { once: true });
		});
	}

	// ── Proxy MJPEG Fallback ───────────────────────────────────────────────
	function proxyStreamUrlForFeed(feed: ResolvedCameraFeed): string {
		if (!feed.entityId) throw new Error('No camera entity for proxy stream.');
		const source = $optimisticEntities[feed.entityId] ?? $liveEntities[feed.entityId];
		const entityPicture = String(source?.attributes?.entity_picture ?? '').trim();
		if (entityPicture) {
			const proxied = entityPicture
				.replace('/api/camera_proxy/', '/api/camera_proxy_stream/')
				.replace('/camera_proxy/', '/camera_proxy_stream/');
			if (
				proxied !== entityPicture ||
				proxied.includes('/camera_proxy_stream/')
			) {
				return absolutizeUrl(proxied);
			}
		}
		const basePath = `/api/camera_proxy_stream/${encodeURIComponent(feed.entityId)}`;
		const token = String(source?.attributes?.access_token ?? '').trim();
		return absolutizeUrl(
			token
				? `${basePath}?token=${encodeURIComponent(token)}`
				: basePath
		);
	}

	async function startProxyStream(
		feed: ResolvedCameraFeed,
		signal: { cancelled: boolean }
	): Promise<void> {
		if (signal.cancelled) return;
		const url = proxyStreamUrlForFeed(feed);
		clearProxyStartupTimer();
		activeMediaMode = 'proxy';
		activeProxyFeedId = feed.id;
		activeProxyUrl = url;
		proxyStartupTimer = setTimeout(() => {
			if (signal.cancelled) return;
			if (activeMediaMode !== 'proxy' || activeProxyFeedId !== feed.id) return;
			setFeedStreamState(feed.id, { status: 'error', message: 'Proxy stream timeout.' });
		}, STREAM_TIMEOUT_MS);
	}

	// ── Start Stream ──────────────────────────────────────────────────────
	async function startStream(
		feed: ResolvedCameraFeed,
		el: HTMLVideoElement,
		signal: { cancelled: boolean }
	) {
		if (feed.sourceType === 'url') {
			const directUrl = String(feed.url ?? '').trim();
			if (!directUrl) {
				setFeedStreamState(feed.id, { status: 'error', message: 'URL feed is empty.' });
				return;
			}
			teardown();
			activeMediaMode = 'video';
			setFeedStreamState(feed.id, { status: 'loading' });
			try {
				await startDirectUrl(feed, el, signal, directUrl);
			} catch (error: unknown) {
				if (signal.cancelled) return;
				const message = (error as { message?: string })?.message;
				teardown();
				setFeedStreamState(feed.id, { status: 'error', message: message ? `Stream unavailable: ${message}` : 'Stream unavailable.' });
			}
			return;
		}

		if (!feed.entityId) {
			setFeedStreamState(feed.id, { status: 'error', message: 'No camera entity selected.' });
			return;
		}

		const conn = $connection as HaConnection | null;
		if (!conn) {
			try {
				teardown();
				setFeedStreamState(feed.id, { status: 'loading' });
				await startProxyStream(feed, signal);
			} catch {
				setFeedStreamState(feed.id, { status: 'error', message: 'No connection.' });
			}
			return;
		}

		teardown();
		activeMediaMode = 'video';
		setFeedStreamState(feed.id, { status: 'loading' });

		try {
			let streamTypes: StreamType[] | null = null;
			try {
				const capabilities = await conn.sendMessagePromise<CameraCapabilities>({
					type: 'camera/capabilities',
					entity_id: feed.entityId
				});
				if (
					Array.isArray(capabilities?.frontend_stream_types) &&
					capabilities.frontend_stream_types.length > 0
				) {
					streamTypes = capabilities.frontend_stream_types;
				}
			} catch {
				streamTypes = null;
			}

			if (!streamTypes) {
				// Unknown capabilities: attempt modern WebRTC first, then HLS fallback.
				try {
					await startWebRtc(feed, el, signal, conn);
				} catch {
					if (signal.cancelled) return;
					teardown();
					await startHls(feed, el, signal, conn);
				}
				return;
			}

			const supportsWebRtc = streamTypes.includes('web_rtc');
			const supportsHls = streamTypes.includes('hls');

			if (supportsWebRtc) {
				try {
					await startWebRtc(feed, el, signal, conn);
				} catch {
					if (signal.cancelled) return;
					if (!supportsHls) throw new Error('WebRTC failed and HLS is not supported for this camera.');
					teardown();
					await startHls(feed, el, signal, conn);
				}
			} else if (supportsHls) {
				await startHls(feed, el, signal, conn);
			} else {
				throw new Error('Camera has no supported frontend stream type.');
			}
		} catch (error: unknown) {
			if (signal.cancelled) return;
			const code = (error as { code?: string })?.code;
			const message = (error as { message?: string })?.message;
			try {
				teardown();
				setFeedStreamState(feed.id, { status: 'loading' });
				await startProxyStream(feed, signal);
				return;
			} catch {
				// Keep original command error handling below if proxy fallback fails.
			}
			if (code === 'start_stream_failed') {
				setFeedStreamState(feed.id, { status: 'error', message: 'Camera does not support streaming.' });
			} else if (code === 'unknown_command') {
				setFeedStreamState(feed.id, { status: 'error', message: 'HA does not support this camera stream command.' });
			} else {
				teardown();
				setFeedStreamState(feed.id, { status: 'error', message: message ? `Stream unavailable: ${message}` : 'Stream unavailable.' });
			}
		}
	}

	// ── Effect ────────────────────────────────────────────────────────────
	$effect(() => {
		const feedId = activeFeedId;
		const el = videoEl;
		if (!feedId || !el) return;
		if (activeStreamFeedId === feedId && attachedVideoEl === el) return;
		const feed = untrack(() => feeds.find((f) => f.id === feedId));
		if (!feed) return;
		activeStreamFeedId = feedId;
		attachedVideoEl = el;
		const token = { cancelled: false };

		startStream(feed, el, token);

		return () => {
			token.cancelled = true;
			activeStreamFeedId = '';
			attachedVideoEl = null;
			teardown();
		};
	});

	const activeStreamState = $derived(
		activeFeed ? (streamStateByFeed[activeFeed.id] ?? { status: 'loading' }) : null
	);

	// ── Feed Selection ─────────────────────────────────────────────────────
	function selectFeed(feedId: string) {
		haptic('medium');
		userSelectedFeedId = feedId;
	}
</script>

<!-- ── Camera More-Info ───────────────────────────────────────────────────── -->
<div class="cammi">

	<!-- ── Header ──────────────────────────────────────────────────────────── -->
	<div class="cammi__header">
		<div class="cammi__icon"><Icon name="camera" size={22} /></div>
		<div class="cammi__state">{stateLabel}</div>
	</div>

	<!-- ── Feed Tabs ────────────────────────────────────────────────────────── -->
	{#if feeds.length > 1}
		<div class="cammi__feeds" role="tablist" aria-label="Camera feeds">
			{#each orderedFeeds as feed (feed.id)}
				<button
					class="cammi__feed-btn"
					class:cammi__feed-btn--active={feed.id === activeFeedId}
					type="button"
					role="tab"
					aria-selected={feed.id === activeFeedId}
					onclick={() => selectFeed(feed.id)}
				>
					<span class="cammi__feed-label">{feed.label}</span>
				</button>
			{/each}
		</div>
	{/if}

	<!-- ── Video ────────────────────────────────────────────────────────────── -->
	<div class="cammi__media">
		<!-- svelte-ignore a11y_media_has_caption -->
			<video
				bind:this={videoEl}
				class="cammi__video"
				class:cammi__video--hidden={activeMediaMode !== 'video' || activeStreamState?.status !== 'ready'}
				autoplay
				muted
				playsinline
			></video>
		{#if activeMediaMode === 'proxy' && activeProxyUrl}
			<img
				bind:this={proxyImgEl}
				class="cammi__proxy-stream"
				src={activeProxyUrl}
				alt=""
				draggable="false"
				onload={() => {
					if (!activeProxyFeedId) return;
					clearProxyStartupTimer();
					setFeedStreamState(activeProxyFeedId, { status: 'ready' });
				}}
				onerror={() => {
					if (!activeProxyFeedId) return;
					clearProxyStartupTimer();
					setFeedStreamState(activeProxyFeedId, { status: 'error', message: 'Proxy stream failed.' });
				}}
			/>
		{/if}

		{#if activeStreamState?.status === 'error'}
			<div class="cammi__overlay">
				<Icon name="video-off" size={28} />
				<span>{activeStreamState.message}</span>
			</div>
		{:else if activeStreamState?.status === 'ready'}
			<span class="cammi__live-badge" aria-label="Live stream active">LIVE</span>
		{/if}
	</div>

</div>

<style>
	/* ── Layout ───────────────────────────────────────────────────────────── */
	.cammi { display:flex; flex-direction:column; gap:12px; padding:18px; }
	.cammi__header { display:flex; align-items:center; gap:10px; color:var(--fg-subtle); }
	.cammi__icon { width:40px; height:40px; border-radius:var(--radius); display:flex; align-items:center; justify-content:center; background:var(--hover); }
	.cammi__state { font-size:0.84rem; text-transform:capitalize; }

	/* ── Feed Tabs ────────────────────────────────────────────────────────── */
	.cammi__feeds { display:flex; gap:8px; overflow-x:auto; padding-bottom:2px; }
	.cammi__feed-btn {
		flex: 0 0 auto;
		border: 1px solid var(--border);
		background: transparent;
		color: var(--fg-subtle);
		border-radius: 10px;
		padding: 6px 12px;
		font-size: 0.74rem;
		font-weight: 600;
		cursor: pointer;
	}
	.cammi__feed-btn--active {
		color: var(--fg);
		border-color: color-mix(in srgb, var(--accent) 50%, var(--border));
		background: color-mix(in srgb, var(--accent) 14%, transparent);
	}

	/* ── Media ────────────────────────────────────────────────────────────── */
	.cammi__media {
		position: relative;
		width: 100%;
		aspect-ratio: 16 / 9;
		background: var(--hover);
		border-radius: var(--radius);
		border: 1px solid var(--border);
		overflow: hidden;
	}
	.cammi__video {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}
	.cammi__proxy-stream {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}
	.cammi__video--hidden { visibility: hidden; }
	.cammi__live-badge {
		position: absolute;
		top: 10px; right: 10px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		height: 18px;
		padding: 0 7px;
		border-radius: 999px;
		border: 1px solid color-mix(in srgb, var(--color-danger) 65%, transparent);
		background: color-mix(in srgb, var(--color-danger) 20%, var(--bg-elevated));
		color: var(--color-danger);
		font-size: 0.62rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		pointer-events: none;
	}

	/* ── Overlay ──────────────────────────────────────────────────────────── */
	.cammi__overlay {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 10px;
		color: var(--fg-subtle);
		font-size: 0.84rem;
	}
</style>
