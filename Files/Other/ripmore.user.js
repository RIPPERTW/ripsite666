// ==UserScript==
// @name         RIPMORE
// @namespace    https://ripsite666.netlify.app/
// @version      0.3
// @description  RIPMORE - скрипт который служит улучшением для пользователей RIPSITE
// @author       RIPPER
// @match        https://dzen.ru/*
// @match        https://store.steampowered.com/app/*
// @match        https://shikimori.io/*
// @match        https://shikimori.one/*
// @match        https://ripsite666.netlify.app/*
// @match        https://rippertw.github.io/*
// @icon         https://ripsite666.netlify.app/Files/Other/RIPMORE.png
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @connect      ripsite666.netlify.app
// @connect      rippertw.github.io
// @connect      steamcommunity.com
// @downloadURL  https://ripsite666.netlify.app/Files/Other/ripmore.user.js
// @updateURL    https://ripsite666.netlify.app/Files/Other/ripmore.user.js
// @run-at       document-start
// ==/UserScript==

(function() {
    'use strict';

    const IS_DZEN = /dzen\.ru/.test(location.hostname);
    const IS_STEAM = /store\.steampowered\.com/.test(location.hostname);
    const IS_SHIKIMORI = /shikimori\.(io|one)/.test(location.hostname);
    const IS_RIPSITE = /ripsite666\.netlify\.app|rippertw\.github\.io/.test(location.hostname);

    const SETTINGS_KEY = 'ripmore_settings';

    const DEFAULT_SETTINGS = {
        global: true,
        custom_player: true,
        site_info: true,
        steam_review: true,
        shikimori_review: true,
        steam_widget: true,
        mirror_data: false
    };

    function getSettings() {
        try {
            const raw = GM_getValue(SETTINGS_KEY, null);
            if (!raw) return { ...DEFAULT_SETTINGS };
            const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
            return { ...DEFAULT_SETTINGS, ...parsed };
        } catch (e) {
            return { ...DEFAULT_SETTINGS };
        }
    }

    function saveSettings(settings) {
        try {
            GM_setValue(SETTINGS_KEY, JSON.stringify(settings));
        } catch (e) {}
    }

    function setSetting(key, value) {
        const s = getSettings();
        s[key] = value;
        saveSettings(s);
    }

    function isEnabled(key) {
        const s = getSettings();
        if (!s.global) return false;
        return s[key] !== false;
    }

    function isSiteInfoEnabled() {
        return isEnabled('site_info');
    }

    const PRIMARY_BASE = 'https://ripsite666.netlify.app';
    const MIRROR_BASE = 'https://rippertw.github.io/ripsite666';

    function getBaseUrl() {
        const s = getSettings();
        if (s.mirror_data) return MIRROR_BASE;
        return PRIMARY_BASE;
    }

    const DB_TIMEOUT_MS = 10000;

    function gmFetchJson(url, timeoutMs) {
        return new Promise((resolve, reject) => {
            let finished = false;
            let timer = null;
            let req = null;
            try {
                req = GM_xmlhttpRequest({
                    method: 'GET',
                    url: url,
                    timeout: timeoutMs,
                    onload: (response) => {
                        if (finished) return;
                        finished = true;
                        if (timer) clearTimeout(timer);
                        if (response.status >= 200 && response.status < 300) {
                            try {
                                const data = JSON.parse(response.responseText);
                                resolve(data);
                            } catch (e) {
                                reject(new Error('JSON parse error'));
                            }
                        } else {
                            reject(new Error('HTTP ' + response.status));
                        }
                    },
                    onerror: () => {
                        if (finished) return;
                        finished = true;
                        if (timer) clearTimeout(timer);
                        reject(new Error('Network error'));
                    },
                    ontimeout: () => {
                        if (finished) return;
                        finished = true;
                        if (timer) clearTimeout(timer);
                        reject(new Error('Timeout'));
                    },
                    onabort: () => {
                        if (finished) return;
                        finished = true;
                        if (timer) clearTimeout(timer);
                        reject(new Error('Aborted'));
                    }
                });
            } catch (e) {
                reject(e);
                return;
            }

            if (timeoutMs && timeoutMs > 0) {
                timer = setTimeout(() => {
                    if (finished) return;
                    finished = true;
                    try {
                        if (req && typeof req.abort === 'function') req.abort();
                    } catch (e) {}
                    reject(new Error('Timeout'));
                }, timeoutMs + 200);
            }
        });
    }

    function buildOfferViewer(kind) {
        const id = kind === 'game' ? 'ripper-mirror-offer-game' : 'ripper-mirror-offer-anime';
        const existing = document.getElementById(id);
        if (existing) return existing;

        const THEME = {
            bg: '#09090f',
            card: '#101015',
            accent: '#c11f2b',
            accentHover: '#d4232f',
            text: '#e0e0ff',
            textMuted: '#a0a0cc',
            border: '#1e1e28'
        };
        const FONT = "'Inter', system-ui, -apple-system, sans-serif";
        const FONT_TITLE = "'Orbitron', 'Inter', sans-serif";

        if (!document.getElementById('ripper-mirror-offer-styles')) {
            const style = document.createElement('style');
            style.id = 'ripper-mirror-offer-styles';
            style.textContent = `
                .ripper-mirror-offer {
                    font-family: ${FONT};
                    background: ${THEME.card};
                    border: 1px solid ${THEME.border};
                    border-radius: 18px;
                    padding: 0;
                    margin: 24px 0;
                    color: ${THEME.text};
                    box-shadow: 0 12px 48px rgba(0,0,0,0.6);
                    overflow: hidden;
                    line-height: 1.6;
                    box-sizing: border-box;
                    width: 100%;
                    max-width: 100%;
                    animation: rmoFadeIn 0.4s ease-out;
                }
                .ripper-mirror-offer * { box-sizing: border-box; }
                @keyframes rmoFadeIn {
                    from { opacity: 0; transform: translateY(8px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                .ripper-mirror-offer .rmo-header {
                    display: flex;
                    align-items: center;
                    gap: 14px;
                    padding: 20px 24px 16px;
                    border-bottom: 1px solid ${THEME.border};
                    background: ${THEME.bg};
                }
                .ripper-mirror-offer .rmo-name {
                    font-family: ${FONT_TITLE};
                    font-weight: 700;
                    font-size: 1.1rem;
                    letter-spacing: 0.8px;
                    color: white;
                    text-shadow: 0 1px 4px rgba(0,0,0,0.6);
                    line-height: 1.2;
                }
                .ripper-mirror-offer .rmo-status {
                    display: inline-flex;
                    align-items: center;
                    font-family: ${FONT_TITLE};
                    font-weight: 700;
                    font-size: 0.72rem;
                    letter-spacing: 1px;
                    text-transform: uppercase;
                    color: ${THEME.textMuted};
                    line-height: 1;
                    margin-top: 3px;
                }
                .ripper-mirror-offer .rmo-body {
                    padding: 20px 24px 22px;
                }
                .ripper-mirror-offer .rmo-text {
                    font-size: 0.95rem;
                    line-height: 1.7;
                    color: ${THEME.text};
                    word-break: break-word;
                }
                .ripper-mirror-offer .rmo-text strong { color: white; font-weight: 600; }
                .ripper-mirror-offer .rmo-error {
                    margin-top: 10px;
                    font-size: 0.85rem;
                    color: #e5534b;
                    word-break: break-word;
                }
                .ripper-mirror-offer .rmo-footer {
                    display: flex;
                    align-items: center;
                    justify-content: flex-end;
                    gap: 10px;
                    padding: 14px 24px 18px;
                    border-top: 1px solid ${THEME.border};
                    background: ${THEME.bg};
                    flex-wrap: wrap;
                }
                .ripper-mirror-offer .rmo-btn {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    font-family: ${FONT_TITLE};
                    font-weight: 700;
                    font-size: 0.78rem;
                    letter-spacing: 1px;
                    text-transform: uppercase;
                    color: white;
                    text-decoration: none;
                    padding: 10px 18px;
                    border-radius: 10px;
                    background: ${THEME.accent};
                    box-shadow: 0 4px 14px rgba(193,31,43,0.3);
                    transition: background 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease, color 0.2s ease, border-color 0.2s ease;
                    border: none;
                    cursor: pointer;
                }
                .ripper-mirror-offer .rmo-btn:hover {
                    background: ${THEME.accentHover};
                    transform: translateY(-1px);
                    box-shadow: 0 6px 20px rgba(193,31,43,0.45);
                    color: white;
                }
                .ripper-mirror-offer .rmo-btn.rmo-outline {
                    background: transparent;
                    color: ${THEME.textMuted};
                    border: 1px solid ${THEME.border};
                    box-shadow: none;
                }
                .ripper-mirror-offer .rmo-btn.rmo-outline:hover {
                    color: white;
                    border-color: ${THEME.accent};
                    background: rgba(193,31,43,0.12);
                    transform: translateY(-1px);
                    box-shadow: none;
                }
                @media (max-width: 640px) {
                    .ripper-mirror-offer .rmo-header { padding: 16px 16px 14px; }
                    .ripper-mirror-offer .rmo-name { font-size: 1rem; }
                    .ripper-mirror-offer .rmo-body { padding: 16px 16px 18px; }
                    .ripper-mirror-offer .rmo-footer {
                        padding: 12px 16px 16px;
                        flex-direction: column;
                        align-items: stretch;
                    }
                    .ripper-mirror-offer .rmo-btn { width: 100%; }
                }
            `;
            (document.head || document.documentElement).appendChild(style);
        }

        const block = document.createElement('div');
        block.id = id;
        block.className = 'ripper-mirror-offer';

        const title = kind === 'game' ? 'RIPSITE · Steam' : 'RIPSITE · Shikimori';
        const statusLabel = kind === 'game' ? 'Данные не загрузились' : 'Данные не загрузились';
        const what = kind === 'game' ? 'база игр' : 'база аниме';

        block.innerHTML = `
            <div class="rmo-header">
                <div>
                    <div class="rmo-name">RIPSITE</div>
                    <div class="rmo-status"><span>${statusLabel}</span></div>
                </div>
            </div>
            <div class="rmo-body">
                <div class="rmo-text">
                    Основной источник не ответил. Можно попробовать загрузить данные с <strong>зеркала</strong>.
                </div>
                <div class="rmo-error" id="${id}-error"></div>
            </div>
            <div class="rmo-footer">
                <button type="button" class="rmo-btn rmo-outline" data-action="retry">
                    Повторить запрос
                </button>
                <button type="button" class="rmo-btn" data-action="mirror">
                    Загрузить с зеркала
                </button>
            </div>
        `;

        const retryBtn = block.querySelector('[data-action="retry"]');
        const mirrorBtn = block.querySelector('[data-action="mirror"]');

        retryBtn.addEventListener('click', () => {
            if (typeof block._onRetry === 'function') block._onRetry();
        });

        mirrorBtn.addEventListener('click', () => {
            setSetting('mirror_data', true);
            if (typeof block._onMirror === 'function') block._onMirror();
        });

        return block;
    }

    function showMirrorOffer(kind, container, onRetry, onMirror, errorText) {
        if (!container || !container.parentNode) return null;
        const offer = buildOfferViewer(kind);
        const errEl = offer.querySelector('#' + offer.id + '-error');
        if (errEl) errEl.textContent = errorText || '';
        offer._onRetry = onRetry;
        offer._onMirror = onMirror;

        const existing = container.parentNode.querySelector('#' + offer.id);
        if (existing) {
            existing.replaceWith(offer);
        } else {
            container.parentNode.insertBefore(offer, container.nextSibling);
        }
        return offer;
    }

    /* =========================================================================
       ЧАСТЬ 1
       ========================================================================= */

    if (IS_DZEN && isEnabled('custom_player')) {
        (function initDzen() {
            const WATERMARK_SELECTORS = [
                '[data-testid="video-controls-watermark"]',
                'div[class*="video-embed--watermark__watermarkWrapper"]',
                'svg[class*="video-embed--video-controls__watermark"]'
            ];

            const RATING_SELECTORS = [
                'div[class*="video-embed--video-controls__rating"]',
                'button[aria-label="Опыт видеопросмотра"]'
            ];

            const AUTHOR_SELECTORS = [
                '[data-testid="video-embed-header-author"]',
                'a[class*="video-embed--video-header-embed__authorName"]'
            ];

            const TITLE_SELECTORS = [
                '[data-testid="video-embed-header-title"]',
                'a[class*="video-embed--video-header-embed__title"]'
            ];

            const CLOSE_BUTTON_SELECTOR = 'button[class*="video-embed--video-header-embed__closeButton"]';
            const CLOSE_SVG_SELECTOR = 'button[class*="video-embed--video-header-embed__closeButton"] svg';
            const CLOSE_USE_SELECTOR = 'button[class*="video-embed--video-header-embed__closeButton"] svg use';

            const SOUND_BUTTON_SELECTOR = 'button[aria-label="Выключить звук"], button[aria-label="Включить звук"]';
            const SOUND_SVG_SELECTOR = 'button[class*="video-embed--video-controls__button"] svg';

            const SLIDER_THUMB_SELECTOR = '[class*="video-embed--slider-input__thumb"]';
            const SLIDER_PROGRESS_SELECTOR = '[class*="video-embed--slider-input__progress"]';
            const SLIDER_TRACK_SELECTOR = '[class*="video-embed--slider-input__track"]';

            const TIME_CONTAINER_SELECTOR = 'div[class*="video-embed--video-controls__time"]';
            const TIME_CURRENT_SELECTOR = 'div[class*="video-embed--video-controls__time"] span[aria-label="Текущее время видео"]';
            const TIME_DURATION_SELECTOR = 'div[class*="video-embed--video-controls__time"] span[aria-label="Общая длительность видео"]';
            const TIME_DURATION_WRAP_SELECTOR = 'span[class*="video-embed--video-controls__timeDuration"]';
            const TIME_SLICE_SELECTOR = 'span[class*="video-embed--video-controls__timeSlice"]';

            const PLAY_BUTTON_SELECTOR = 'button[class*="video-embed--video-state__button"]';
            const PLAY_BUTTON_SVG_SELECTOR = 'button[class*="video-embed--video-state__button"] svg';
            const PLAY_BUTTON_USE_SELECTOR = 'button[class*="video-embed--video-state__button"] svg use';

            const FULLSCREEN_BUTTON_SELECTOR = 'button[class*="video-embed--video-fullscreen-toggle__videoFullscreenToggle"]';
            const FULLSCREEN_SVG_SELECTOR = 'button[class*="video-embed--video-fullscreen-toggle__videoFullscreenToggle"] svg';
            const FULLSCREEN_USE_SELECTOR = 'button[class*="video-embed--video-fullscreen-toggle__videoFullscreenToggle"] svg use';

            const SPEED_WRAPPER_SELECTOR   = 'div[class*="video-embed--video-controls__speed"]';
            const QUALITY_WRAPPER_SELECTOR = 'div[class*="video-embed--video-controls__quality"]';

            const SPEED_BUTTON_SELECTOR    = 'button[aria-label="Скорость воспроизведения"]';
            const QUALITY_BUTTON_SELECTOR  = 'button[aria-label="Качество видео"]';

            const RIGHT_GROUP_SELECTOR     = 'div[class*="video-embed--video-controls__right"]';
            const COMPOSER_ITEM_SELECTOR   = 'div[class*="video-embed--video-controls__composerItem"]';

            const POPUP_BASE_SELECTOR      = '[data-testid="popup-base"]';
            const POPUP_CONTENT_SELECTOR   = 'div[class*="video-embed--video-controls-popup__content"]';
            const POPUP_TITLE_SELECTOR     = 'h4[class*="video-embed--video-controls-content__title"]';

            const POPUP_GRID_SELECTOR      = 'div[class*="video-embed--video-controls-grid__videoControlsGrid"]';
            const POPUP_GRID_ITEM_SELECTOR = 'div[class*="video-embed--video-controls-grid__title"]';
            const POPUP_GRID_ACTIVE_SELECTOR = 'div[class*="video-embed--video-controls-grid__isActive"]';

            const POPUP_LIST_SELECTOR      = 'div[class*="video-embed--video-controls-list__videoControlsList"]';
            const POPUP_LIST_ITEM_SELECTOR = 'button[class*="video-embed--video-controls-list__listItem"]';
            const POPUP_LIST_TEXT_SELECTOR = 'span[class*="video-embed--video-controls-list__listItemText"]';
            const POPUP_LIST_ICON_WRAP_SELECTOR = 'span[class*="video-embed--video-controls-list__listItemIconContainer"]';
            const POPUP_LIST_ICON_SELECTOR = 'svg[class*="video-embed--video-controls-list__activeIcon"]';

            const VIDEO_STATE_SELECTOR = '[class*="video-embed--video-state__videoState"]';
            const STATE_CHANGE_INDICATOR_SELECTOR = '[class*="video-embed--video-state-change-indicator__stateChangeIndicator"]';
            const TIMELINE_PREVIEW_IMAGE_SELECTOR = '[class*="video-embed--video-timeline-preview__image"]';
            const TIMELINE_PREVIEW_LABEL_TIME_SELECTOR = '[class*="video-embed--video-timeline-preview__labelTime"]';

            const SUBTITLES_SELECTOR = '[class*="video-embed--styles__videoSubtitles"]';

            const SETTINGS_BTN_ID  = 'vk-video-settings-btn';
            const SETTINGS_MENU_ID = 'vk-video-settings-menu';
            const SETTINGS_WRAP_ID = 'vk-video-settings-wrap';
            const PIP_BTN_ID       = 'vk-video-pip-btn';

            const THEME = {
                bg:          '#09090f',
                card:        '#101015',
                accent:      '#c11f2b',
                accentHover: '#d4232f',
                text:        '#e0e0ff',
                textMuted:   '#a0a0cc',
                border:      '#1e1e28',
                borderHover: '#2a2a38'
            };

            const ICON_COLOR = THEME.textMuted;
            const ICON_HOVER_COLOR = '#4a4a66';
            const ICON_HOVER_BG = 'rgba(0, 0, 0, 0.35)';
            const TITLE_TEXT_SHADOW = '0 0 3px #000, 0 0 3px #000, 0 0 2px #000, 0 1px 2px #000';

            const IDLE_HIDE_DELAY = 3000;

            let hasPlayed = false;
            let settingsIdleTimer = null;
            let settingsVisible = false;

            function injectGlobalStyles() {
                if (document.getElementById('vk-video-theme-styles')) return;

                const style = document.createElement('style');
                style.id = 'vk-video-theme-styles';
                style.textContent = `
                    .video-embed--video-timeline__cursor-1_:after,
                    [class*="video-embed--video-timeline__cursor"]:after {
                        background-color: ${THEME.accent} !important;
                        border-color: ${THEME.accent} !important;
                        box-shadow: 0 0 6px rgba(193, 31, 43, 0.7) !important;
                    }

                    .video-embed--video-timeline__episodeProgress-2t,
                    [class*="video-embed--video-timeline__episodeProgress"] {
                        background: ${THEME.accent} !important;
                    }

                    .video-embed--video-timeline__timelineEpisode-12,
                    [class*="video-embed--video-timeline__timelineEpisode"] {
                        background: ${THEME.border} !important;
                    }

                    [class*="video-embed--video-timeline__timelineEpisode"]:hover {
                        background: #2a2a38 !important;
                    }

                    .video-embed--animated-play-button__play-3b:after,
                    .video-embed--animated-play-button__play-3b:before {
                        content: "";
                        display: block;
                        top: 0;
                        right: 0;
                        bottom: 0;
                        left: 0;
                        position: absolute;
                        background: ${THEME.accent} !important;
                        z-index: -1;
                        border-radius: 50%;
                        transition: all .45s cubic-bezier(0, 0, .4, 1.3);
                    }

                    ${AUTHOR_SELECTORS.join(', ')} {
                        display: none !important;
                    }

                    ${TITLE_SELECTORS.join(', ')} {
                        color: ${ICON_COLOR} !important;
                        pointer-events: none !important;
                        cursor: default !important;
                        text-decoration: none !important;
                        text-shadow: ${TITLE_TEXT_SHADOW} !important;
                    }

                    ${TIME_CONTAINER_SELECTOR} {
                        color: ${ICON_COLOR} !important;
                        font-family: 'Inter', system-ui, sans-serif !important;
                        font-weight: 600 !important;
                        transition: color 0.25s ease !important;
                    }

                    ${TIME_CURRENT_SELECTOR} {
                        color: ${ICON_COLOR} !important;
                        font-weight: 600 !important;
                    }

                    ${TIME_DURATION_SELECTOR} {
                        color: ${ICON_COLOR} !important;
                        font-weight: 500 !important;
                    }

                    ${TIME_DURATION_WRAP_SELECTOR},
                    ${TIME_DURATION_WRAP_SELECTOR} span {
                        color: ${ICON_COLOR} !important;
                    }

                    ${TIME_SLICE_SELECTOR} {
                        color: ${ICON_COLOR} !important;
                        opacity: 0.7 !important;
                    }

                    ${PLAY_BUTTON_SELECTOR},
                    ${PLAY_BUTTON_SELECTOR} *,
                    ${PLAY_BUTTON_SVG_SELECTOR},
                    ${PLAY_BUTTON_SVG_SELECTOR} *,
                    ${PLAY_BUTTON_USE_SELECTOR},
                    ${PLAY_BUTTON_USE_SELECTOR} * {
                        color: ${ICON_COLOR} !important;
                        fill: ${ICON_COLOR} !important;
                    }

                    ${FULLSCREEN_BUTTON_SELECTOR},
                    ${FULLSCREEN_BUTTON_SELECTOR} *,
                    ${FULLSCREEN_SVG_SELECTOR},
                    ${FULLSCREEN_SVG_SELECTOR} *,
                    ${FULLSCREEN_USE_SELECTOR},
                    ${FULLSCREEN_USE_SELECTOR} * {
                        color: ${ICON_COLOR} !important;
                        fill: ${ICON_COLOR} !important;
                    }

                    ${CLOSE_BUTTON_SELECTOR},
                    ${CLOSE_BUTTON_SELECTOR} *,
                    ${CLOSE_SVG_SELECTOR},
                    ${CLOSE_SVG_SELECTOR} *,
                    ${CLOSE_USE_SELECTOR},
                    ${CLOSE_USE_SELECTOR} * {
                        color: ${ICON_COLOR} !important;
                        fill: ${ICON_COLOR} !important;
                    }

                    ${SOUND_BUTTON_SELECTOR},
                    ${SOUND_BUTTON_SELECTOR} *,
                    ${SOUND_SVG_SELECTOR},
                    ${SOUND_SVG_SELECTOR} * {
                        color: ${ICON_COLOR} !important;
                        fill: ${ICON_COLOR} !important;
                    }

                    ${SLIDER_THUMB_SELECTOR} {
                        background: ${THEME.accent} !important;
                        box-shadow: 0 0 8px rgba(193, 31, 43, 0.6) !important;
                    }

                    ${SLIDER_PROGRESS_SELECTOR} {
                        background: ${THEME.accent} !important;
                    }

                    ${SLIDER_TRACK_SELECTOR} {
                        background: ${THEME.border} !important;
                    }

                    ${VIDEO_STATE_SELECTOR} {
                        color: ${THEME.textMuted} !important;
                    }

                    ${STATE_CHANGE_INDICATOR_SELECTOR} {
                        background-color: transparent !important;
                    }

                    ${TIMELINE_PREVIEW_IMAGE_SELECTOR} {
                        border-color: ${THEME.textMuted} !important;
                    }

                    ${TIMELINE_PREVIEW_LABEL_TIME_SELECTOR} {
                        color: ${THEME.textMuted} !important;
                    }

                    ${SUBTITLES_SELECTOR} {
                        letter-spacing: -.24px !important;
                        letter-spacing: var(--textTitleLetterSpacing, -.24px) !important;
                        position: absolute !important;
                        padding: 12px 16px !important;
                        border-radius: 16px !important;
                        display: flex !important;
                        align-items: start !important;
                        flex-direction: column !important;
                        color: #fff !important;
                        color: #ffffff !important;
                        background-color: rgba(0, 0, 0, .48) !important;
                        background-color: rgb(255 255 255 / 0%) !important;
                        transition: bottom .15s ease-out, opacity .1s ease-out !important;
                        opacity: 1 !important;
                        font-size: 19px !important;
                        text-shadow: 0 0 4px rgba(0, 0, 0, .8), 0 0 8px rgba(0, 0, 0, .6), 1px 1px 2px rgba(0, 0, 0, .9) !important;
                    }

                    #${SETTINGS_BTN_ID},
                    #${PIP_BTN_ID} {
                        color: ${ICON_COLOR} !important;
                        fill: ${ICON_COLOR} !important;
                        background: transparent !important;
                    }

                    #${SETTINGS_BTN_ID} svg,
                    #${SETTINGS_BTN_ID} svg *,
                    #${PIP_BTN_ID} svg,
                    #${PIP_BTN_ID} svg * {
                        color: ${ICON_COLOR} !important;
                        fill: ${ICON_COLOR} !important;
                        transition: color 0.1s ease, fill 0.1s ease !important;
                    }

                    #${SETTINGS_BTN_ID}:hover,
                    #${PIP_BTN_ID}:hover {
                        background: transparent !important;
                        border-radius: 10px !important;
                    }

                    #${SETTINGS_BTN_ID}:hover svg,
                    #${SETTINGS_BTN_ID}:hover svg *,
                    #${PIP_BTN_ID}:hover svg,
                    #${PIP_BTN_ID}:hover svg * {
                        color: ${ICON_HOVER_COLOR} !important;
                        fill: ${ICON_HOVER_COLOR} !important;
                    }

                    #${SETTINGS_MENU_ID} [data-action]:hover {
                        background: rgba(193, 31, 43, 0.25) !important;
                        color: #ffffff !important;
                    }

                    #${SETTINGS_MENU_ID}::-webkit-scrollbar {
                        width: 6px;
                    }
                    #${SETTINGS_MENU_ID}::-webkit-scrollbar-thumb {
                        background: ${THEME.accent};
                        border-radius: 3px;
                    }

                    ${POPUP_BASE_SELECTOR} {
                        background: ${THEME.card} !important;
                        border: 1px solid ${THEME.border} !important;
                        border-radius: 16px !important;
                        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.55) !important;
                        overflow: hidden !important;
                        backdrop-filter: blur(12px) !important;
                    }

                    ${POPUP_CONTENT_SELECTOR} {
                        background: transparent !important;
                        padding: 4px !important;
                    }

                    ${POPUP_TITLE_SELECTOR} {
                        color: ${THEME.accent} !important;
                        font-family: 'Inter', system-ui, sans-serif !important;
                        font-weight: 700 !important;
                        font-size: 13px !important;
                        letter-spacing: 0.6px !important;
                        padding: 12px 16px 8px !important;
                        margin: 0 !important;
                        text-transform: uppercase !important;
                        border-bottom: 1px solid ${THEME.border} !important;
                    }

                    ${POPUP_GRID_SELECTOR} {
                        display: grid !important;
                        grid-template-columns: repeat(4, minmax(64px, 1fr)) !important;
                        gap: 6px !important;
                        padding: 10px !important;
                        background: transparent !important;
                    }

                    ${POPUP_GRID_SELECTOR} ${POPUP_GRID_ITEM_SELECTOR} {
                        background: ${THEME.bg} !important;
                        border: 1px solid ${THEME.border} !important;
                        border-radius: 12px !important;
                        color: ${THEME.text} !important;
                        font-family: 'Inter', system-ui, sans-serif !important;
                        font-weight: 600 !important;
                        font-size: 13px !important;
                        text-align: center !important;
                        padding: 10px 6px !important;
                        cursor: pointer !important;
                        transition: background 0.25s ease, border-color 0.25s ease, color 0.25s ease, transform 0.25s ease, box-shadow 0.25s ease !important;
                        user-select: none !important;
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        min-height: 40px !important;
                        line-height: 1 !important;
                        box-shadow: none !important;
                    }

                    ${POPUP_GRID_SELECTOR} ${POPUP_GRID_ITEM_SELECTOR}:hover {
                        background: rgba(193, 31, 43, 0.18) !important;
                        border-color: ${THEME.accent} !important;
                        color: #ffffff !important;
                        transform: translateY(-2px) !important;
                        box-shadow: 0 6px 18px rgba(193, 31, 43, 0.2) !important;
                    }

                    ${POPUP_GRID_SELECTOR} ${POPUP_GRID_ACTIVE_SELECTOR} {
                        background: ${THEME.accent} !important;
                        border-color: ${THEME.accent} !important;
                        color: #ffffff !important;
                        box-shadow: 0 0 0 1px ${THEME.accent}, 0 6px 18px rgba(193, 31, 43, 0.35) !important;
                    }

                    ${POPUP_GRID_SELECTOR} ${POPUP_GRID_ACTIVE_SELECTOR}:hover {
                        background: ${THEME.accentHover} !important;
                        border-color: ${THEME.accentHover} !important;
                    }

                    ${POPUP_LIST_SELECTOR} {
                        display: flex !important;
                        flex-direction: column !important;
                        gap: 4px !important;
                        padding: 8px !important;
                        background: transparent !important;
                        max-height: 320px !important;
                        overflow-y: auto !important;
                    }

                    ${POPUP_LIST_ITEM_SELECTOR} {
                        background: ${THEME.bg} !important;
                        border: 1px solid ${THEME.border} !important;
                        border-radius: 12px !important;
                        color: ${THEME.text} !important;
                        font-family: 'Inter', system-ui, sans-serif !important;
                        font-weight: 600 !important;
                        font-size: 13px !important;
                        padding: 10px 14px !important;
                        cursor: pointer !important;
                        transition: background 0.25s ease, border-color 0.25s ease, color 0.25s ease, transform 0.25s ease, box-shadow 0.25s ease !important;
                        user-select: none !important;
                        display: flex !important;
                        align-items: center !important;
                        justify-content: space-between !important;
                        width: 100% !important;
                        text-align: left !important;
                        outline: none !important;
                        box-shadow: none !important;
                    }

                    ${POPUP_LIST_ITEM_SELECTOR}:hover {
                        background: rgba(193, 31, 43, 0.18) !important;
                        border-color: ${THEME.accent} !important;
                        color: #ffffff !important;
                        transform: translateY(-1px) !important;
                        box-shadow: 0 4px 14px rgba(193, 31, 43, 0.2) !important;
                    }

                    ${POPUP_LIST_ITEM_SELECTOR}[aria-current="true"] {
                        background: ${THEME.accent} !important;
                        border-color: ${THEME.accent} !important;
                        color: #ffffff !important;
                        box-shadow: 0 0 0 1px ${THEME.accent}, 0 6px 18px rgba(193, 31, 43, 0.35) !important;
                    }

                    ${POPUP_LIST_ITEM_SELECTOR}[aria-current="true"]:hover {
                        background: ${THEME.accentHover} !important;
                        border-color: ${THEME.accentHover} !important;
                    }

                    ${POPUP_LIST_TEXT_SELECTOR} {
                        color: inherit !important;
                        font-family: inherit !important;
                        font-weight: inherit !important;
                        font-size: inherit !important;
                    }

                    ${POPUP_LIST_ICON_WRAP_SELECTOR} {
                        display: inline-flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        color: inherit !important;
                    }

                    ${POPUP_LIST_ICON_SELECTOR} {
                        fill: currentColor !important;
                        color: inherit !important;
                        width: 20px !important;
                        height: 20px !important;
                        display: block !important;
                    }

                    ${POPUP_LIST_SELECTOR}::-webkit-scrollbar {
                        width: 6px;
                    }
                    ${POPUP_LIST_SELECTOR}::-webkit-scrollbar-thumb {
                        background: ${THEME.accent};
                        border-radius: 3px;
                    }
                    ${POPUP_LIST_SELECTOR}::-webkit-scrollbar-track {
                        background: transparent;
                    }

                    ${POPUP_BASE_SELECTOR}::-webkit-scrollbar {
                        width: 6px;
                    }
                    ${POPUP_BASE_SELECTOR}::-webkit-scrollbar-thumb {
                        background: ${THEME.accent};
                        border-radius: 3px;
                    }

                    #${SETTINGS_MENU_ID} {
                        position: absolute;
                        background: ${THEME.card} !important;
                        border: 1px solid ${THEME.border} !important;
                        border-radius: 16px !important;
                        padding: 6px !important;
                        display: none;
                        min-width: 180px;
                        z-index: 2147483647;
                        color: ${THEME.text};
                        font-family: 'Inter', system-ui, sans-serif;
                        font-size: 14px;
                        box-shadow: 0 12px 40px rgba(0,0,0,0.55) !important;
                        user-select: none;
                        overflow: hidden;
                        backdrop-filter: blur(12px);
                    }

                    #${SETTINGS_MENU_ID} [data-action] {
                        padding: 12px 16px;
                        cursor: pointer;
                        transition: background 0.25s ease, color 0.25s ease, transform 0.25s ease, box-shadow 0.25s ease;
                        color: ${THEME.text};
                        font-weight: 600;
                        font-size: 13px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        border-radius: 12px;
                        border: 1px solid transparent;
                        background: ${THEME.bg};
                        margin-bottom: 4px;
                        text-align: center;
                    }

                    #${SETTINGS_MENU_ID} [data-action]:last-child {
                        margin-bottom: 0;
                    }

                    #${SETTINGS_MENU_ID} [data-action]:hover {
                        background: rgba(193, 31, 43, 0.18) !important;
                        border-color: ${THEME.accent} !important;
                        color: #ffffff !important;
                        transform: translateY(-1px);
                        box-shadow: 0 4px 14px rgba(193, 31, 43, 0.2);
                    }

                    .vk-video-hidden-by-script {
                        opacity: 0 !important;
                        visibility: hidden !important;
                        pointer-events: none !important;
                        transition: opacity 0.25s ease, visibility 0.25s ease !important;
                    }
                `;
                (document.head || document.documentElement).appendChild(style);
            }

            function getFullscreenElement() {
                return document.fullscreenElement ||
                       document.webkitFullscreenElement ||
                       document.mozFullScreenElement ||
                       document.msFullscreenElement ||
                       null;
            }

            function findRightGroup(root) {
                root = root || document;

                const right = root.querySelector(RIGHT_GROUP_SELECTOR);
                if (right) return right;

                const composers = root.querySelectorAll(COMPOSER_ITEM_SELECTOR);
                if (composers.length) return composers[composers.length - 1];

                const speed   = root.querySelector(SPEED_WRAPPER_SELECTOR);
                const quality = root.querySelector(QUALITY_WRAPPER_SELECTOR);
                const anchor  = speed || quality;
                if (anchor && anchor.parentElement) return anchor.parentElement;

                return null;
            }

            function getControlsHost() {
                const fs = getFullscreenElement();
                if (fs) {
                    const host = findRightGroup(fs);
                    if (host) return host;
                    return fs;
                }
                return findRightGroup(document);
            }

            function getMenuHost() {
                return getFullscreenElement() || document.body;
            }

            function setSettingsVisibility(visible) {
                const wrap = document.getElementById(SETTINGS_WRAP_ID);
                const btn  = document.getElementById(SETTINGS_BTN_ID);
                const pip  = document.getElementById(PIP_BTN_ID);
                const menu = document.getElementById(SETTINGS_MENU_ID);

                if (wrap) {
                    if (visible) wrap.classList.remove('vk-video-hidden-by-script');
                    else wrap.classList.add('vk-video-hidden-by-script');
                }
                if (btn) {
                    if (visible) btn.classList.remove('vk-video-hidden-by-script');
                    else btn.classList.add('vk-video-hidden-by-script');
                }
                if (pip) {
                    if (visible) pip.classList.remove('vk-video-hidden-by-script');
                    else pip.classList.add('vk-video-hidden-by-script');
                }

                if (!visible && menu) {
                    menu.style.display = 'none';
                }

                settingsVisible = visible;
            }

            function showSettingsTemporarily() {
                if (!hasPlayed) {
                    setSettingsVisibility(false);
                    return;
                }

                setSettingsVisibility(true);

                if (settingsIdleTimer) {
                    clearTimeout(settingsIdleTimer);
                }
                settingsIdleTimer = setTimeout(() => {
                    setSettingsVisibility(false);
                }, IDLE_HIDE_DELAY);
            }

            function scheduleHideSettings() {
                if (settingsIdleTimer) {
                    clearTimeout(settingsIdleTimer);
                }
                settingsIdleTimer = setTimeout(() => {
                    setSettingsVisibility(false);
                }, IDLE_HIDE_DELAY);
            }

            function removeUnwantedElements() {
                WATERMARK_SELECTORS.forEach(selector => {
                    document.querySelectorAll(selector).forEach(el => {
                        const target = el.closest('[data-testid="video-controls-watermark"]') ||
                                       el.closest('div[class*="watermarkWrapper"]') ||
                                       el;
                        target.remove();
                    });
                });

                RATING_SELECTORS.forEach(selector => {
                    document.querySelectorAll(selector).forEach(el => {
                        const target = el.closest('div[class*="video-embed--video-controls__rating"]') ||
                                       el.closest('div[class*="video-controls-popup__videoControlsPopup"]') ||
                                       el;
                        target.remove();
                    });
                });
            }

            function styleHeader() {
                AUTHOR_SELECTORS.forEach(selector => {
                    document.querySelectorAll(selector).forEach(el => {
                        el.style.display = 'none';
                    });
                });

                TITLE_SELECTORS.forEach(selector => {
                    document.querySelectorAll(selector).forEach(el => {
                        el.style.color = ICON_COLOR;
                        el.style.pointerEvents = 'none';
                        el.style.cursor = 'default';
                        el.style.textDecoration = 'none';
                        el.style.transition = 'opacity 0.25s ease, visibility 0.25s ease';
                        el.style.setProperty('text-shadow', TITLE_TEXT_SHADOW, 'important');

                        if (!hasPlayed) {
                            el.classList.add('vk-video-hidden-by-script');
                        } else {
                            el.classList.remove('vk-video-hidden-by-script');
                        }

                        if (!el.dataset.vkHeaderStyled) {
                            el.dataset.vkHeaderStyled = 'true';
                            el.addEventListener('click', (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                            }, true);
                        }
                    });
                });

                const headerContainers = document.querySelectorAll('div[class*="video-embed--video-controls__headerFull"]');
                headerContainers.forEach(el => {
                    el.style.transition = 'opacity 0.25s ease, visibility 0.25s ease';
                    if (!hasPlayed) {
                        el.classList.add('vk-video-hidden-by-script');
                    } else {
                        el.classList.remove('vk-video-hidden-by-script');
                    }
                });

                const headerWrappers = document.querySelectorAll('div[class*="video-embed--video-header-embed__container"]');
                headerWrappers.forEach(el => {
                    el.style.transition = 'opacity 0.25s ease, visibility 0.25s ease';
                    if (!hasPlayed) {
                        el.classList.add('vk-video-hidden-by-script');
                    } else {
                        el.classList.remove('vk-video-hidden-by-script');
                    }
                });

                const headerFull = document.querySelectorAll('div[class*="video-embed--video-header-embed__header"], div[class*="video-embed--video-header-embed__wrapper"], div[class*="video-embed--video-header-embed__inner"]');
                headerFull.forEach(el => {
                    el.style.transition = 'opacity 0.25s ease, visibility 0.25s ease';
                    if (!hasPlayed) {
                        el.classList.add('vk-video-hidden-by-script');
                    } else {
                        el.classList.remove('vk-video-hidden-by-script');
                    }
                });
            }

            function styleTime() {
                document.querySelectorAll(TIME_CONTAINER_SELECTOR).forEach(el => {
                    el.style.color = ICON_COLOR;
                    el.style.fontFamily = "'Inter', system-ui, sans-serif";
                    el.style.fontWeight = '600';
                    el.style.transition = 'color 0.25s ease';
                });

                document.querySelectorAll(TIME_CURRENT_SELECTOR).forEach(el => {
                    el.style.color = ICON_COLOR;
                    el.style.fontWeight = '600';
                });

                document.querySelectorAll(TIME_DURATION_SELECTOR).forEach(el => {
                    el.style.color = ICON_COLOR;
                    el.style.fontWeight = '500';
                });

                document.querySelectorAll(TIME_DURATION_WRAP_SELECTOR).forEach(el => {
                    el.style.color = ICON_COLOR;
                    el.querySelectorAll('span').forEach(s => {
                        s.style.color = ICON_COLOR;
                    });
                });

                document.querySelectorAll(TIME_SLICE_SELECTOR).forEach(el => {
                    el.style.color = ICON_COLOR;
                    el.style.opacity = '0.7';
                });
            }

            function stylePlayButton() {
                document.querySelectorAll(PLAY_BUTTON_SELECTOR).forEach(btn => {
                    btn.style.color = ICON_COLOR;
                    btn.style.fill = ICON_COLOR;
                    btn.querySelectorAll('*').forEach(child => {
                        child.style.setProperty('color', ICON_COLOR, 'important');
                        child.style.setProperty('fill', ICON_COLOR, 'important');
                    });
                });

                document.querySelectorAll(PLAY_BUTTON_SVG_SELECTOR).forEach(svg => {
                    svg.style.color = ICON_COLOR;
                    svg.style.fill = ICON_COLOR;
                    svg.querySelectorAll('*').forEach(child => {
                        child.style.setProperty('color', ICON_COLOR, 'important');
                        child.style.setProperty('fill', ICON_COLOR, 'important');
                    });
                });

                document.querySelectorAll(PLAY_BUTTON_USE_SELECTOR).forEach(use => {
                    use.style.setProperty('color', ICON_COLOR, 'important');
                    use.style.setProperty('fill', ICON_COLOR, 'important');
                });
            }

            function styleFullscreenButton() {
                document.querySelectorAll(FULLSCREEN_BUTTON_SELECTOR).forEach(btn => {
                    btn.style.color = ICON_COLOR;
                    btn.style.fill = ICON_COLOR;
                    btn.querySelectorAll('*').forEach(child => {
                        child.style.setProperty('color', ICON_COLOR, 'important');
                        child.style.setProperty('fill', ICON_COLOR, 'important');
                    });
                });

                document.querySelectorAll(FULLSCREEN_SVG_SELECTOR).forEach(svg => {
                    svg.style.color = ICON_COLOR;
                    svg.style.fill = ICON_COLOR;
                    svg.querySelectorAll('*').forEach(child => {
                        child.style.setProperty('color', ICON_COLOR, 'important');
                        child.style.setProperty('fill', ICON_COLOR, 'important');
                    });
                });

                document.querySelectorAll(FULLSCREEN_USE_SELECTOR).forEach(use => {
                    use.style.setProperty('color', ICON_COLOR, 'important');
                    use.style.setProperty('fill', ICON_COLOR, 'important');
                });
            }

            function styleCloseButton() {
                document.querySelectorAll(CLOSE_BUTTON_SELECTOR).forEach(btn => {
                    btn.style.color = ICON_COLOR;
                    btn.style.fill = ICON_COLOR;
                    btn.querySelectorAll('*').forEach(child => {
                        child.style.setProperty('color', ICON_COLOR, 'important');
                        child.style.setProperty('fill', ICON_COLOR, 'important');
                    });
                });

                document.querySelectorAll(CLOSE_SVG_SELECTOR).forEach(svg => {
                    svg.style.color = ICON_COLOR;
                    svg.style.fill = ICON_COLOR;
                    svg.querySelectorAll('*').forEach(child => {
                        child.style.setProperty('color', ICON_COLOR, 'important');
                        child.style.setProperty('fill', ICON_COLOR, 'important');
                    });
                });

                document.querySelectorAll(CLOSE_USE_SELECTOR).forEach(use => {
                    use.style.setProperty('color', ICON_COLOR, 'important');
                    use.style.setProperty('fill', ICON_COLOR, 'important');
                });
            }

            function styleSoundAndSlider() {
                document.querySelectorAll(SOUND_BUTTON_SELECTOR).forEach(btn => {
                    btn.style.color = ICON_COLOR;
                    btn.style.fill = ICON_COLOR;
                    btn.querySelectorAll('*').forEach(child => {
                        child.style.setProperty('color', ICON_COLOR, 'important');
                        child.style.setProperty('fill', ICON_COLOR, 'important');
                    });
                });

                document.querySelectorAll(SOUND_SVG_SELECTOR).forEach(svg => {
                    svg.style.color = ICON_COLOR;
                    svg.style.fill = ICON_COLOR;
                    svg.querySelectorAll('*').forEach(child => {
                        child.style.setProperty('color', ICON_COLOR, 'important');
                        child.style.setProperty('fill', ICON_COLOR, 'important');
                    });
                });

                document.querySelectorAll(SLIDER_THUMB_SELECTOR).forEach(el => {
                    el.style.background = THEME.accent;
                    el.style.boxShadow = '0 0 8px rgba(193, 31, 43, 0.6)';
                });

                document.querySelectorAll(SLIDER_PROGRESS_SELECTOR).forEach(el => {
                    el.style.background = THEME.accent;
                });

                document.querySelectorAll(SLIDER_TRACK_SELECTOR).forEach(el => {
                    el.style.background = THEME.border;
                });
            }

            function hideOriginalButtons() {
                [SPEED_WRAPPER_SELECTOR, QUALITY_WRAPPER_SELECTOR].forEach(sel => {
                    document.querySelectorAll(sel).forEach(el => {
                        el.style.visibility    = 'hidden';
                        el.style.position      = 'absolute';
                        el.style.pointerEvents = 'none';
                    });
                });
            }

            function removeSettingsUI() {
                const wrap = document.getElementById(SETTINGS_WRAP_ID);
                if (wrap) wrap.remove();
                const menu = document.getElementById(SETTINGS_MENU_ID);
                if (menu) menu.remove();
            }

            function createSettingsUI() {
                const host     = getControlsHost();
                const menuHost = getMenuHost();

                if (!host) {
                    removeSettingsUI();
                    return;
                }

                const existingWrap = document.getElementById(SETTINGS_WRAP_ID);
                const existingMenu = document.getElementById(SETTINGS_MENU_ID);

                if (existingWrap && existingWrap.parentElement === host &&
                    existingMenu && existingMenu.parentElement === menuHost) {
                    if (!hasPlayed) {
                        setSettingsVisibility(false);
                    }
                    return;
                }

                removeSettingsUI();

                const wrapper = document.createElement('div');
                wrapper.id = SETTINGS_WRAP_ID;
                wrapper.style.cssText = 'position: relative; display: inline-flex; align-items: center; transition: opacity 0.25s ease, visibility 0.25s ease;';

                const pipBtn = document.createElement('button');
                pipBtn.id = PIP_BTN_ID;
                pipBtn.type = 'button';
                pipBtn.setAttribute('aria-label', 'Картинка в картинке');
                pipBtn.style.cssText = `
                    background: transparent;
                    border: none;
                    cursor: pointer;
                    padding: 0;
                    margin: 0 4px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 32px;
                    height: 32px;
                    color: ${ICON_COLOR};
                    fill: ${ICON_COLOR};
                    pointer-events: auto;
                    transition: none;
                    border-radius: 10px;
                `;
                pipBtn.innerHTML = `
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="${ICON_COLOR}" style="color:${ICON_COLOR};fill:${ICON_COLOR};transition:color 0.1s ease, fill 0.1s ease;">
                        <path d="M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z"/>
                    </svg>
                `;
                pipBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    const v = document.querySelector('video');
                    if (!v) return;
                    if (document.pictureInPictureElement) {
                        document.exitPictureInPicture().catch(() => {});
                    } else {
                        v.requestPictureInPicture().catch(() => {});
                    }
                    showSettingsTemporarily();
                });
                pipBtn.addEventListener('mousedown',   (e) => e.stopPropagation(), true);
                pipBtn.addEventListener('mouseup',     (e) => e.stopPropagation(), true);
                pipBtn.addEventListener('pointerdown', (e) => e.stopPropagation(), true);
                wrapper.appendChild(pipBtn);

                const btn = document.createElement('button');
                btn.id = SETTINGS_BTN_ID;
                btn.type = 'button';
                btn.setAttribute('aria-label', 'Настройки');
                btn.style.cssText = `
                    background: transparent;
                    border: none;
                    cursor: pointer;
                    padding: 0;
                    margin: 0 4px;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 32px;
                    height: 32px;
                    color: ${ICON_COLOR};
                    fill: ${ICON_COLOR};
                    pointer-events: auto;
                    transition: none;
                    border-radius: 10px;
                `;
                btn.innerHTML = `
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="${ICON_COLOR}" style="color:${ICON_COLOR};fill:${ICON_COLOR};transition:color 0.1s ease, fill 0.1s ease;">
                        <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
                    </svg>
                `;
                wrapper.appendChild(btn);

                const menu = document.createElement('div');
                menu.id = SETTINGS_MENU_ID;
                menu.innerHTML = `
                    <div data-action="speed">
                        Скорость
                    </div>
                    <div data-action="quality">
                        Качество
                    </div>
                `;

                menu.addEventListener('click', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    const item = e.target.closest('[data-action]');
                    if (!item) return;
                    const action = item.getAttribute('data-action');
                    menu.style.display = 'none';

                    const selector = action === 'speed' ? SPEED_BUTTON_SELECTOR : QUALITY_BUTTON_SELECTOR;
                    const wrapSel  = action === 'speed' ? SPEED_WRAPPER_SELECTOR : QUALITY_WRAPPER_SELECTOR;

                    const orig = document.querySelector(selector);
                    if (!orig) return;
                    const wrap = orig.closest(wrapSel);
                    if (wrap) {
                        wrap.style.visibility    = 'visible';
                        wrap.style.position      = '';
                        wrap.style.pointerEvents = '';
                    }
                    setTimeout(() => {
                        orig.click();
                        setTimeout(() => {
                            if (wrap) {
                                wrap.style.visibility    = 'hidden';
                                wrap.style.position      = 'absolute';
                                wrap.style.pointerEvents = 'none';
                            }
                        }, 200);
                    }, 0);
                });

                function toggleMenu(e) {
                    e.stopPropagation();
                    e.preventDefault();

                    const isOpen = menu.style.display === 'block';
                    if (isOpen) {
                        menu.style.display = 'none';
                        return;
                    }

                    const rect = btn.getBoundingClientRect();
                    menu.style.display = 'block';
                    const menuRect = menu.getBoundingClientRect();
                    let top  = rect.top - menuRect.height - 8;
                    let left = rect.left + rect.width / 2 - menuRect.width / 2;
                    if (top < 4) top = rect.bottom + 8;
                    if (left < 4) left = 4;
                    if (left + menuRect.width > window.innerWidth - 4) {
                        left = window.innerWidth - menuRect.width - 4;
                    }
                    menu.style.top  = top + 'px';
                    menu.style.left = left + 'px';

                    showSettingsTemporarily();
                }

                btn.addEventListener('click', toggleMenu, true);
                btn.addEventListener('mousedown',   (e) => e.stopPropagation(), true);
                btn.addEventListener('mouseup',     (e) => e.stopPropagation(), true);
                btn.addEventListener('pointerdown', (e) => e.stopPropagation(), true);

                host.appendChild(wrapper);
                menuHost.appendChild(menu);

                if (!window.__vkVideoSettingsOutsideHandler) {
                    window.__vkVideoSettingsOutsideHandler = true;
                    document.addEventListener('click', (e) => {
                        const m = document.getElementById(SETTINGS_MENU_ID);
                        const b = document.getElementById(SETTINGS_BTN_ID);
                        if (!m) return;
                        if (b && b.contains(e.target)) return;
                        if (m.contains(e.target)) return;
                        m.style.display = 'none';
                    }, true);
                }

                if (!hasPlayed) {
                    setSettingsVisibility(false);
                } else {
                    showSettingsTemporarily();
                }
            }

            function stylePopups() {
                document.querySelectorAll(POPUP_BASE_SELECTOR).forEach(popup => {
                    popup.style.background = THEME.card;
                    popup.style.border = `1px solid ${THEME.border}`;
                    popup.style.borderRadius = '16px';
                    popup.style.boxShadow = '0 12px 40px rgba(0,0,0,0.55)';
                    popup.style.overflow = 'hidden';
                    popup.style.backdropFilter = 'blur(12px)';
                });

                document.querySelectorAll(POPUP_CONTENT_SELECTOR).forEach(content => {
                    content.style.background = 'transparent';
                    content.style.padding = '4px';
                });

                document.querySelectorAll(POPUP_TITLE_SELECTOR).forEach(title => {
                    title.style.color = THEME.accent;
                    title.style.fontFamily = "'Inter', system-ui, sans-serif";
                    title.style.fontWeight = '700';
                    title.style.fontSize = '13px';
                    title.style.letterSpacing = '0.6px';
                    title.style.padding = '12px 16px 8px';
                    title.style.margin = '0';
                    title.style.textTransform = 'uppercase';
                    title.style.borderBottom = `1px solid ${THEME.border}`;
                });

                document.querySelectorAll(POPUP_GRID_SELECTOR).forEach(grid => {
                    grid.style.display = 'grid';
                    grid.style.gridTemplateColumns = 'repeat(4, minmax(64px, 1fr))';
                    grid.style.gap = '6px';
                    grid.style.padding = '10px';
                    grid.style.background = 'transparent';
                });

                document.querySelectorAll(POPUP_GRID_SELECTOR + ' ' + POPUP_GRID_ITEM_SELECTOR).forEach(item => {
                    const isActive = item.matches(POPUP_GRID_SELECTOR + ' ' + POPUP_GRID_ACTIVE_SELECTOR) ||
                                     item.classList.contains('video-embed--video-controls-grid__isActive-Cb');
                    item.style.background = isActive ? THEME.accent : THEME.bg;
                    item.style.border = `1px solid ${isActive ? THEME.accent : THEME.border}`;
                    item.style.borderRadius = '12px';
                    item.style.color = isActive ? '#ffffff' : THEME.text;
                    item.style.fontFamily = "'Inter', system-ui, sans-serif";
                    item.style.fontWeight = '600';
                    item.style.fontSize = '13px';
                    item.style.textAlign = 'center';
                    item.style.padding = '10px 6px';
                    item.style.cursor = 'pointer';
                    item.style.transition = 'background 0.25s ease, border-color 0.25s ease, color 0.25s ease, transform 0.25s ease, box-shadow 0.25s ease';
                    item.style.userSelect = 'none';
                    item.style.display = 'flex';
                    item.style.alignItems = 'center';
                    item.style.justifyContent = 'center';
                    item.style.minHeight = '40px';
                    item.style.lineHeight = '1';
                    item.style.boxShadow = isActive
                        ? `0 0 0 1px ${THEME.accent}, 0 6px 18px rgba(193, 31, 43, 0.35)`
                        : 'none';
                });

                document.querySelectorAll(POPUP_LIST_SELECTOR).forEach(list => {
                    list.style.display = 'flex';
                    list.style.flexDirection = 'column';
                    list.style.gap = '4px';
                    list.style.padding = '8px';
                    list.style.background = 'transparent';
                    list.style.maxHeight = '320px';
                    list.style.overflowY = 'auto';
                });

                document.querySelectorAll(POPUP_LIST_ITEM_SELECTOR).forEach(item => {
                    const isActive = item.getAttribute('aria-current') === 'true';
                    item.style.background = isActive ? THEME.accent : THEME.bg;
                    item.style.border = `1px solid ${isActive ? THEME.accent : THEME.border}`;
                    item.style.borderRadius = '12px';
                    item.style.color = isActive ? '#ffffff' : THEME.text;
                    item.style.fontFamily = "'Inter', system-ui, sans-serif";
                    item.style.fontWeight = '600';
                    item.style.fontSize = '13px';
                    item.style.padding = '10px 14px';
                    item.style.cursor = 'pointer';
                    item.style.transition = 'background 0.25s ease, border-color 0.25s ease, color 0.25s ease, transform 0.25s ease, box-shadow 0.25s ease';
                    item.style.userSelect = 'none';
                    item.style.display = 'flex';
                    item.style.alignItems = 'center';
                    item.style.justifyContent = 'space-between';
                    item.style.width = '100%';
                    item.style.textAlign = 'left';
                    item.style.outline = 'none';
                    item.style.boxShadow = isActive
                        ? `0 0 0 1px ${THEME.accent}, 0 6px 18px rgba(193, 31, 43, 0.35)`
                        : 'none';
                });

                document.querySelectorAll(POPUP_LIST_TEXT_SELECTOR).forEach(text => {
                    text.style.color = 'inherit';
                    text.style.fontFamily = 'inherit';
                    text.style.fontWeight = 'inherit';
                    text.style.fontSize = 'inherit';
                });

                document.querySelectorAll(POPUP_LIST_ICON_WRAP_SELECTOR).forEach(wrap => {
                    wrap.style.display = 'inline-flex';
                    wrap.style.alignItems = 'center';
                    wrap.style.justifyContent = 'center';
                    wrap.style.color = 'inherit';
                });

                document.querySelectorAll(POPUP_LIST_ICON_SELECTOR).forEach(icon => {
                    icon.style.fill = 'currentColor';
                    icon.style.color = 'inherit';
                    icon.style.width = '20px';
                    icon.style.height = '20px';
                    icon.style.display = 'block';
                });
            }

            function styleVideoStateAndPreview() {
                document.querySelectorAll(VIDEO_STATE_SELECTOR).forEach(el => {
                    el.style.color = THEME.textMuted;
                });

                document.querySelectorAll(STATE_CHANGE_INDICATOR_SELECTOR).forEach(el => {
                    el.style.backgroundColor = 'transparent';
                });

                document.querySelectorAll(TIMELINE_PREVIEW_IMAGE_SELECTOR).forEach(el => {
                    el.style.borderColor = THEME.textMuted;
                });

                document.querySelectorAll(TIMELINE_PREVIEW_LABEL_TIME_SELECTOR).forEach(el => {
                    el.style.color = THEME.textMuted;
                });
            }

            function styleSubtitles() {
                document.querySelectorAll(SUBTITLES_SELECTOR).forEach(el => {
                    el.style.letterSpacing = '-.24px';
                    el.style.setProperty('letter-spacing', 'var(--textTitleLetterSpacing, -.24px)');
                    el.style.position = 'absolute';
                    el.style.padding = '12px 16px';
                    el.style.borderRadius = '16px';
                    el.style.display = 'flex';
                    el.style.alignItems = 'start';
                    el.style.flexDirection = 'column';
                    el.style.color = '#fff';
                    el.style.setProperty('color', '#ffffff');
                    el.style.backgroundColor = 'rgba(0, 0, 0, .48)';
                    el.style.setProperty('background-color', 'rgb(255 255 255 / 0%)');
                    el.style.transition = 'bottom .15s ease-out, opacity .1s ease-out';
                    el.style.opacity = '1';
                    el.style.fontSize = '19px';
                    el.style.textShadow = '0 0 4px rgba(0, 0, 0, .8), 0 0 8px rgba(0, 0, 0, .6), 1px 1px 2px rgba(0, 0, 0, .9)';
                });
            }

            function tick() {
                injectGlobalStyles();
                removeUnwantedElements();
                styleHeader();
                styleTime();
                stylePlayButton();
                styleFullscreenButton();
                styleCloseButton();
                styleSoundAndSlider();
                hideOriginalButtons();
                createSettingsUI();
                stylePopups();
                styleVideoStateAndPreview();
                styleSubtitles();
            }

            function markPlayed() {
                if (!hasPlayed) {
                    hasPlayed = true;
                    tick();
                    showSettingsTemporarily();
                }
            }

            document.addEventListener('play', markPlayed, true);
            document.addEventListener('playing', markPlayed, true);
            document.addEventListener('timeupdate', () => {
                const v = document.querySelector('video');
                if (v && v.currentTime > 0) markPlayed();
            }, true);

            const observer = new MutationObserver(tick);
            observer.observe(document.documentElement, {
                childList: true,
                subtree: true
            });

            ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange']
                .forEach(evt => document.addEventListener(evt, () => {
                    removeSettingsUI();
                    setTimeout(tick, 100);
                    setTimeout(tick, 400);
                    showSettingsTemporarily();
                }));

            ['mousemove', 'mousedown', 'keydown', 'touchstart', 'pointermove'].forEach(evt => {
                document.addEventListener(evt, showSettingsTemporarily, true);
            });

            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    tick();
                    scheduleHideSettings();
                });
            } else {
                tick();
                scheduleHideSettings();
            }

            setInterval(tick, 1000);
        })();
    }

    /* =========================================================================
       ЧАСТЬ 2
       ========================================================================= */

    if (IS_STEAM && isSiteInfoEnabled() && isEnabled('steam_review')) {
        (function initSteam() {
            const SITE_URL = 'https://ripsite666.netlify.app';
            const THEME = {
                bg:          '#09090f',
                card:        '#101015',
                accent:      '#c11f2b',
                accentHover: '#d4232f',
                text:        '#e0e0ff',
                textMuted:   '#a0a0cc',
                border:      '#1e1e28',
            };
            const FONT = "'Inter', system-ui, -apple-system, sans-serif";
            const FONT_TITLE = "'Orbitron', 'Inter', sans-serif";

            function injectStyles() {
                if (document.getElementById('ripper-steam-styles')) return;
                const style = document.createElement('style');
                style.id = 'ripper-steam-styles';
                style.textContent = `
                    #ripper-game-block,
                    #ripper-game-skeleton,
                    #ripper-game-suggest {
                        font-family: ${FONT};
                        background: ${THEME.card};
                        border: 1px solid ${THEME.border};
                        border-radius: 18px;
                        padding: 0;
                        margin: 24px 0;
                        color: ${THEME.text};
                        box-shadow: 0 12px 48px rgba(0,0,0,0.6);
                        position: relative;
                        overflow: hidden;
                        line-height: 1.6;
                        isolation: isolate;
                        box-sizing: border-box;
                        width: 100%;
                        max-width: 100%;
                    }

                    #ripper-game-block *,
                    #ripper-game-skeleton *,
                    #ripper-game-suggest * {
                        box-sizing: border-box;
                    }

                    #ripper-game-block,
                    #ripper-game-suggest {
                        animation: rgpFadeIn 0.4s ease-out;
                    }

                    @keyframes rgpFadeIn {
                        from { opacity: 0; transform: translateY(8px); }
                        to   { opacity: 1; transform: translateY(0); }
                    }

                    @keyframes rgpShimmer {
                        0%   { background-position: 200% 0; }
                        100% { background-position: -200% 0; }
                    }

                    #ripper-game-skeleton .rgp-sk-header {
                        display: flex;
                        align-items: center;
                        gap: 14px;
                        padding: 20px 24px 16px;
                        border-bottom: 1px solid ${THEME.border};
                        background: ${THEME.bg};
                    }

                    #ripper-game-skeleton .rgp-sk-info {
                        display: flex;
                        flex-direction: column;
                        gap: 8px;
                        flex: 1;
                        min-width: 0;
                    }

                    #ripper-game-skeleton .rgp-sk-line {
                        background: linear-gradient(90deg, ${THEME.border} 0%, #2a2a38 50%, ${THEME.border} 100%);
                        background-size: 200% 100%;
                        border-radius: 6px;
                        animation: rgpShimmer 1.4s ease-in-out infinite;
                    }

                    #ripper-game-skeleton .rgp-sk-name {
                        height: 18px;
                        width: 100px;
                    }

                    #ripper-game-skeleton .rgp-sk-status {
                        height: 11px;
                        width: 140px;
                        opacity: 0.7;
                    }

                    #ripper-game-skeleton .rgp-sk-rank {
                        width: 54px;
                        height: 54px;
                        flex-shrink: 0;
                        clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
                        background: linear-gradient(90deg, ${THEME.border} 0%, #2a2a38 50%, ${THEME.border} 100%);
                        background-size: 200% 100%;
                        animation: rgpShimmer 1.4s ease-in-out infinite;
                    }

                    #ripper-game-skeleton .rgp-sk-body {
                        padding: 20px 24px 22px;
                        display: flex;
                        flex-direction: column;
                        gap: 10px;
                    }

                    #ripper-game-skeleton .rgp-sk-text {
                        height: 12px;
                        width: 100%;
                    }

                    #ripper-game-skeleton .rgp-sk-text.short-1 { width: 92%; }
                    #ripper-game-skeleton .rgp-sk-text.short-2 { width: 78%; }
                    #ripper-game-skeleton .rgp-sk-text.short-3 { width: 60%; }

                    #ripper-game-skeleton .rgp-sk-footer {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        gap: 12px;
                        padding: 14px 24px 18px;
                        border-top: 1px solid ${THEME.border};
                        background: ${THEME.bg};
                        flex-wrap: wrap;
                    }

                    #ripper-game-skeleton .rgp-sk-date {
                        height: 12px;
                        width: 90px;
                        border-radius: 6px;
                        background: linear-gradient(90deg, ${THEME.border} 0%, #2a2a38 50%, ${THEME.border} 100%);
                        background-size: 200% 100%;
                        animation: rgpShimmer 1.4s ease-in-out infinite;
                    }

                    #ripper-game-skeleton .rgp-sk-btn {
                        height: 34px;
                        width: 170px;
                        border-radius: 10px;
                        background: linear-gradient(90deg, ${THEME.border} 0%, #2a2a38 50%, ${THEME.border} 100%);
                        background-size: 200% 100%;
                        animation: rgpShimmer 1.4s ease-in-out infinite;
                    }

                    #ripper-game-block .rgp-header,
                    #ripper-game-suggest .rgp-header {
                        display: flex;
                        align-items: center;
                        gap: 14px;
                        padding: 20px 24px 16px;
                        border-bottom: 1px solid ${THEME.border};
                        background: ${THEME.bg};
                    }

                    #ripper-game-block .rgp-info,
                    #ripper-game-suggest .rgp-info {
                        display: flex;
                        flex-direction: column;
                        gap: 3px;
                        min-width: 0;
                        flex: 1;
                    }

                    #ripper-game-block .rgp-name,
                    #ripper-game-suggest .rgp-name {
                        font-family: ${FONT_TITLE};
                        font-weight: 700;
                        font-size: 1.1rem;
                        letter-spacing: 0.8px;
                        color: white;
                        text-shadow: 0 1px 4px rgba(0,0,0,0.6);
                        line-height: 1.2;
                    }

                    #ripper-game-block .rgp-status,
                    #ripper-game-suggest .rgp-status {
                        display: inline-flex;
                        align-items: center;
                        font-family: ${FONT_TITLE};
                        font-weight: 700;
                        font-size: 0.72rem;
                        letter-spacing: 1px;
                        text-transform: uppercase;
                        color: ${THEME.textMuted};
                        line-height: 1;
                    }

                    #ripper-game-block .rgp-rank {
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        font-family: ${FONT_TITLE};
                        font-size: 1.6rem;
                        font-weight: 900;
                        color: white;
                        width: 54px;
                        height: 54px;
                        text-shadow: 0 3px 12px rgba(0,0,0,0.7);
                        clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
                        position: relative;
                        flex-shrink: 0;
                        filter: drop-shadow(0 4px 12px rgba(0,0,0,0.5));
                    }

                    #ripper-game-block .rgp-rank::before {
                        content: '';
                        position: absolute;
                        inset: 4px;
                        clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
                        background: rgba(16,16,21,0.9);
                        z-index: 1;
                    }

                    #ripper-game-block .rgp-rank::after {
                        content: '';
                        position: absolute;
                        inset: 7px;
                        clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
                        background: rgba(16,16,21,0.98);
                        z-index: 1;
                    }

                    #ripper-game-block .rgp-rank > span {
                        position: relative;
                        z-index: 3;
                        line-height: 1;
                    }

                    #ripper-game-block .rgp-rank.rank-S { background: linear-gradient(135deg, #c11f2b, #6a0f17); }
                    #ripper-game-block .rgp-rank.rank-A { background: linear-gradient(135deg, #c11f2b, #8a1520); }
                    #ripper-game-block .rgp-rank.rank-B { background: linear-gradient(135deg, #8a1520, #4a0a10); }
                    #ripper-game-block .rgp-rank.rank-C { background: linear-gradient(135deg, #5a3a7a, #2a1a3a); }
                    #ripper-game-block .rgp-rank.rank-D { background: linear-gradient(135deg, #2a4a5a, #152530); }
                    #ripper-game-block .rgp-rank.rank-E { background: linear-gradient(135deg, #3a3a5a, #1a1a2e); }
                    #ripper-game-block .rgp-rank.rank-F { background: linear-gradient(135deg, #2a2a3a, #151520); }

                    #ripper-game-block .rgp-body {
                        padding: 20px 24px 22px;
                        background: ${THEME.card};
                    }

                    #ripper-game-block .rgp-quote {
                        font-size: 0.95rem;
                        line-height: 1.7;
                        color: ${THEME.text};
                        white-space: pre-wrap;
                        word-break: break-word;
                        border-left: 2px solid rgba(193,31,43,0.35);
                        padding-left: 14px;
                        max-height: 360px;
                        overflow-y: auto;
                        scrollbar-width: thin;
                        scrollbar-color: ${THEME.accent} ${THEME.border};
                    }

                    #ripper-game-block .rgp-quote::-webkit-scrollbar {
                        width: 6px;
                    }
                    #ripper-game-block .rgp-quote::-webkit-scrollbar-track {
                        background: ${THEME.border};
                        border-radius: 3px;
                    }
                    #ripper-game-block .rgp-quote::-webkit-scrollbar-thumb {
                        background: ${THEME.accent};
                        border-radius: 3px;
                    }

                    #ripper-game-block .rgp-footer,
                    #ripper-game-suggest .rgp-footer {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        gap: 12px;
                        padding: 14px 24px 18px;
                        border-top: 1px solid ${THEME.border};
                        background: ${THEME.bg};
                        flex-wrap: wrap;
                    }

                    #ripper-game-block .rgp-date {
                        font-size: 0.8rem;
                        color: ${THEME.textMuted};
                        font-style: italic;
                        letter-spacing: 0.3px;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }

                    #ripper-game-block .rgp-date svg {
                        width: 14px;
                        height: 14px;
                        fill: currentColor;
                        opacity: 0.7;
                    }

                    #ripper-game-block .rgp-link,
                    #ripper-game-suggest .rgp-link {
                        display: inline-flex;
                        align-items: center;
                        gap: 8px;
                        font-family: ${FONT_TITLE};
                        font-weight: 700;
                        font-size: 0.78rem;
                        letter-spacing: 1px;
                        text-transform: uppercase;
                        color: white;
                        text-decoration: none;
                        padding: 9px 18px;
                        border-radius: 10px;
                        background: ${THEME.accent};
                        box-shadow: 0 4px 14px rgba(193,31,43,0.3);
                        transition: background 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
                        border: none;
                        cursor: pointer;
                    }

                    #ripper-game-block .rgp-link:hover,
                    #ripper-game-suggest .rgp-link:hover {
                        background: ${THEME.accentHover};
                        transform: translateY(-1px);
                        box-shadow: 0 6px 20px rgba(193,31,43,0.45);
                        color: white;
                        text-decoration: none;
                    }

                    #ripper-game-block .rgp-link svg,
                    #ripper-game-suggest .rgp-link svg {
                        width: 13px;
                        height: 13px;
                        fill: currentColor;
                    }

                    #ripper-game-block .rgp-footer-actions {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        flex-wrap: wrap;
                    }

                    #ripper-game-block .rgp-back {
                        display: inline-flex;
                        align-items: center;
                        gap: 8px;
                        font-family: ${FONT_TITLE};
                        font-weight: 700;
                        font-size: 0.75rem;
                        letter-spacing: 1px;
                        text-transform: uppercase;
                        color: ${THEME.textMuted};
                        background: transparent;
                        border: 1px solid ${THEME.border};
                        padding: 9px 16px;
                        border-radius: 10px;
                        cursor: pointer;
                        transition: color 0.2s ease, border-color 0.2s ease, background 0.2s ease;
                    }

                    #ripper-game-block .rgp-back:hover {
                        color: white;
                        border-color: ${THEME.accent};
                        background: rgba(193,31,43,0.12);
                    }

                    #ripper-game-block .rgp-back svg {
                        width: 13px;
                        height: 13px;
                        fill: currentColor;
                    }

                    #ripper-game-suggest .rgp-suggest-body {
                        padding: 20px 24px 22px;
                        display: flex;
                        flex-direction: column;
                        gap: 14px;
                        overflow: hidden;
                    }

                    #ripper-game-suggest .rgp-suggest-text {
                        font-size: 0.93rem;
                        line-height: 1.6;
                        color: ${THEME.text};
                        word-break: break-word;
                    }

                    #ripper-game-suggest .rgp-suggest-text strong {
                        color: white;
                        font-weight: 600;
                    }

                    #ripper-game-suggest .rgp-suggest-search {
                        position: relative;
                        width: 100%;
                        max-width: 100%;
                    }

                    #ripper-game-suggest .rgp-suggest-search-input {
                        width: 100%;
                        max-width: 100%;
                        padding: 12px 16px 12px 42px;
                        background: ${THEME.bg};
                        border: 1px solid ${THEME.border};
                        border-radius: 12px;
                        color: ${THEME.text};
                        font-family: ${FONT};
                        font-size: 0.92rem;
                        outline: none;
                        transition: border-color 0.2s ease, box-shadow 0.2s ease;
                    }

                    #ripper-game-suggest .rgp-suggest-search-input::placeholder {
                        color: ${THEME.textMuted};
                        opacity: 0.7;
                    }

                    #ripper-game-suggest .rgp-suggest-search-input:focus {
                        border-color: ${THEME.accent};
                        box-shadow: 0 0 0 3px rgba(193,31,43,0.18);
                    }

                    #ripper-game-suggest .rgp-suggest-search-icon {
                        position: absolute;
                        left: 14px;
                        top: 50%;
                        transform: translateY(-50%);
                        width: 16px;
                        height: 16px;
                        fill: ${THEME.textMuted};
                        pointer-events: none;
                        opacity: 0.7;
                    }

                    #ripper-game-suggest .rgp-suggest-list {
                        display: flex;
                        flex-direction: column;
                        gap: 8px;
                        max-height: 320px;
                        overflow-y: auto;
                        overflow-x: hidden;
                        scrollbar-width: thin;
                        scrollbar-color: ${THEME.accent} ${THEME.border};
                        padding-right: 4px;
                        width: 100%;
                        max-width: 100%;
                    }

                    #ripper-game-suggest .rgp-suggest-list::-webkit-scrollbar {
                        width: 6px;
                    }
                    #ripper-game-suggest .rgp-suggest-list::-webkit-scrollbar-track {
                        background: ${THEME.border};
                        border-radius: 3px;
                    }
                    #ripper-game-suggest .rgp-suggest-list::-webkit-scrollbar-thumb {
                        background: ${THEME.accent};
                        border-radius: 3px;
                    }

                    #ripper-game-suggest .rgp-suggest-item {
                        display: flex;
                        align-items: center;
                        gap: 14px;
                        padding: 12px 16px;
                        background: ${THEME.bg};
                        border: 1px solid ${THEME.border};
                        border-radius: 12px;
                        cursor: pointer;
                        transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
                        user-select: none;
                        width: 100%;
                        max-width: 100%;
                    }

                    #ripper-game-suggest .rgp-suggest-item:hover {
                        background: rgba(193,31,43,0.12);
                        border-color: ${THEME.accent};
                        transform: translateY(-1px);
                    }

                    #ripper-game-suggest .rgp-suggest-item-title {
                        flex: 1;
                        font-size: 0.95rem;
                        font-weight: 600;
                        color: ${THEME.text};
                        min-width: 0;
                        word-break: break-word;
                    }

                    #ripper-game-suggest .rgp-suggest-item-rank {
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        font-family: ${FONT_TITLE};
                        font-size: 1rem;
                        font-weight: 900;
                        color: white;
                        width: 34px;
                        height: 34px;
                        text-shadow: 0 2px 8px rgba(0,0,0,0.7);
                        clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
                        position: relative;
                        flex-shrink: 0;
                    }

                    #ripper-game-suggest .rgp-suggest-item-rank::before {
                        content: '';
                        position: absolute;
                        inset: 3px;
                        clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
                        background: rgba(16,16,21,0.9);
                        z-index: 1;
                    }

                    #ripper-game-suggest .rgp-suggest-item-rank::after {
                        content: '';
                        position: absolute;
                        inset: 5px;
                        clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
                        background: rgba(16,16,21,0.98);
                        z-index: 1;
                    }

                    #ripper-game-suggest .rgp-suggest-item-rank > span {
                        position: relative;
                        z-index: 3;
                        line-height: 1;
                    }

                    #ripper-game-suggest .rgp-suggest-item-rank.rank-S { background: linear-gradient(135deg, #c11f2b, #6a0f17); }
                    #ripper-game-suggest .rgp-suggest-item-rank.rank-A { background: linear-gradient(135deg, #c11f2b, #8a1520); }
                    #ripper-game-suggest .rgp-suggest-item-rank.rank-B { background: linear-gradient(135deg, #8a1520, #4a0a10); }
                    #ripper-game-suggest .rgp-suggest-item-rank.rank-C { background: linear-gradient(135deg, #5a3a7a, #2a1a3a); }
                    #ripper-game-suggest .rgp-suggest-item-rank.rank-D { background: linear-gradient(135deg, #2a4a5a, #152530); }
                    #ripper-game-suggest .rgp-suggest-item-rank.rank-E { background: linear-gradient(135deg, #3a3a5a, #1a1a2e); }
                    #ripper-game-suggest .rgp-suggest-item-rank.rank-F { background: linear-gradient(135deg, #2a2a3a, #151520); }
                    #ripper-game-suggest .rgp-suggest-item-rank.rank-_ { background: linear-gradient(135deg, #2a2a3a, #151520); }

                    #ripper-game-suggest .rgp-suggest-empty {
                        padding: 20px 16px;
                        text-align: center;
                        color: ${THEME.textMuted};
                        font-size: 0.9rem;
                        font-style: italic;
                    }

                    @media (max-width: 640px) {
                        #ripper-game-block .rgp-header,
                        #ripper-game-skeleton .rgp-sk-header,
                        #ripper-game-suggest .rgp-header {
                            padding: 16px 16px 14px;
                            gap: 12px;
                        }
                        #ripper-game-block .rgp-name,
                        #ripper-game-suggest .rgp-name {
                            font-size: 1rem;
                        }
                        #ripper-game-block .rgp-rank,
                        #ripper-game-skeleton .rgp-sk-rank {
                            width: 46px;
                            height: 46px;
                            font-size: 1.4rem;
                        }
                        #ripper-game-block .rgp-body,
                        #ripper-game-skeleton .rgp-sk-body,
                        #ripper-game-suggest .rgp-suggest-body {
                            padding: 16px 16px 18px;
                        }
                        #ripper-game-block .rgp-quote {
                            font-size: 0.88rem;
                            max-height: 280px;
                        }
                        #ripper-game-block .rgp-footer,
                        #ripper-game-skeleton .rgp-sk-footer,
                        #ripper-game-suggest .rgp-footer {
                            padding: 12px 16px 16px;
                            flex-direction: column;
                            align-items: stretch;
                        }
                        #ripper-game-block .rgp-link,
                        #ripper-game-suggest .rgp-link {
                            justify-content: center;
                            width: 100%;
                        }
                        #ripper-game-block .rgp-footer-actions {
                            flex-direction: column;
                            align-items: stretch;
                            width: 100%;
                        }
                        #ripper-game-block .rgp-back {
                            justify-content: center;
                            width: 100%;
                        }
                        #ripper-game-skeleton .rgp-sk-btn {
                            width: 100%;
                        }
                    }
                `;
                (document.head || document.documentElement).appendChild(style);
            }

            function createSkeleton() {
                const sk = document.createElement('div');
                sk.id = 'ripper-game-skeleton';
                sk.innerHTML = `
                    <div class="rgp-sk-header">
                        <div class="rgp-sk-info">
                            <div class="rgp-sk-line rgp-sk-name"></div>
                            <div class="rgp-sk-line rgp-sk-status"></div>
                        </div>
                        <div class="rgp-sk-rank"></div>
                    </div>
                    <div class="rgp-sk-body">
                        <div class="rgp-sk-line rgp-sk-text"></div>
                        <div class="rgp-sk-line rgp-sk-text short-1"></div>
                        <div class="rgp-sk-line rgp-sk-text short-2"></div>
                        <div class="rgp-sk-line rgp-sk-text short-3"></div>
                    </div>
                    <div class="rgp-sk-footer">
                        <div class="rgp-sk-date"></div>
                        <div class="rgp-sk-btn"></div>
                    </div>
                `;
                return sk;
            }

            function normalizeTitle(title) {
                return title
                    .toLowerCase()
                    .replace(/[™®©]/g, '')
                    .replace(/[:\-–—]/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();
            }

            function escapeHtml(text) {
                const div = document.createElement('div');
                div.textContent = text;
                return div.innerHTML;
            }

            function slugify(title) {
                return encodeURIComponent(title);
            }

            function getSteamTitle() {
                const titleEl = document.querySelector('.apphub_AppName');
                if (titleEl) return titleEl.textContent.trim();
                const metaTitle = document.querySelector('meta[property="og:title"]');
                if (metaTitle) return metaTitle.content.replace(/ on Steam$/, '').trim();
                return document.title.replace(/ on Steam$/, '').trim();
            }

            function scoreMatch(steamTitle, gameTitle) {
                const normSteam = normalizeTitle(steamTitle);
                const normDb = normalizeTitle(gameTitle);
                if (normDb === normSteam) return 100;

                const steamWords = normSteam.split(' ').filter(w => w.length > 1);
                const dbWords = normDb.split(' ').filter(w => w.length > 1);
                if (steamWords.length === 0 || dbWords.length === 0) return 0;

                let score = 0;
                for (const sw of steamWords) {
                    for (const dw of dbWords) {
                        if (sw === dw) score += 2;
                        else if (sw.length > 3 && dw.length > 3 && (sw.startsWith(dw) || dw.startsWith(sw))) score += 1.2;
                        else if (sw.length > 3 && dw.length > 3 && (sw.includes(dw) || dw.includes(sw))) score += 0.8;
                    }
                }
                const maxLen = Math.max(steamWords.length, dbWords.length);
                return (score / maxLen) * 100;
            }

            function findSuggestions(steamTitle, db) {
                const scored = [];
                for (const game of db) {
                    const s = scoreMatch(steamTitle, game.title);
                    if (s >= 30) scored.push({ game, score: s });
                }
                scored.sort((a, b) => b.score - a.score);
                return scored.slice(0, 10).map(s => s.game);
            }

            function filterByQuery(query, db) {
                const q = normalizeTitle(query);
                if (!q) return [];
                const words = q.split(' ').filter(w => w.length > 0);
                const scored = [];
                for (const game of db) {
                    const normDb = normalizeTitle(game.title);
                    let score = 0;
                    let allMatch = true;
                    for (const w of words) {
                        if (normDb.includes(w)) score += 2;
                        else if (w.length > 2) {
                            const dbWords = normDb.split(' ');
                            let partial = false;
                            for (const dw of dbWords) {
                                if (dw.startsWith(w) || w.startsWith(dw)) { partial = true; break; }
                            }
                            if (partial) score += 1;
                            else allMatch = false;
                        }
                    }
                    if (allMatch || words.length === 1) {
                        if (score > 0) scored.push({ game, score });
                    }
                }
                scored.sort((a, b) => b.score - a.score);
                return scored.slice(0, 20).map(s => s.game);
            }

            function renderSuggestItem(game, index) {
                const rankClass = game.rang && game.rang !== '_' ? `rank-${game.rang}` : 'rank-_';
                const rankDisplay = game.rang && game.rang !== '_' ? game.rang : '?';
                return `
                    <div class="rgp-suggest-item" data-index="${index}">
                        <div class="rgp-suggest-item-title">${escapeHtml(game.title)}</div>
                        <div class="rgp-suggest-item-rank ${rankClass}"><span>${rankDisplay}</span></div>
                    </div>
                `;
            }

            function createSuggestBlock(steamTitle, initialSuggestions, db, onPick) {
                const block = document.createElement('div');
                block.id = 'ripper-game-suggest';

                block.innerHTML = `
                    <div class="rgp-header">
                        <div class="rgp-info">
                            <div class="rgp-name">RIPSITE</div>
                            <div class="rgp-status"><span>Выбор игры</span></div>
                        </div>
                    </div>
                    <div class="rgp-suggest-body">
                        <div class="rgp-suggest-text">
                            Точного совпадения для <strong>«${escapeHtml(steamTitle)}»</strong> нет.
                            Возможно, на сайте игра называется по-другому. Выберите вариант из списка или найдите через поиск.
                        </div>
                        <div class="rgp-suggest-search">
                            <svg class="rgp-suggest-search-icon" viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                            <input type="text" class="rgp-suggest-search-input" placeholder="Поиск игры на сайте...">
                        </div>
                        <div class="rgp-suggest-list"></div>
                    </div>
                `;

                const listEl = block.querySelector('.rgp-suggest-list');
                const searchInput = block.querySelector('.rgp-suggest-search-input');

                function renderList(items) {
                    if (items.length === 0) {
                        listEl.innerHTML = '<div class="rgp-suggest-empty">Ничего не найдено. Попробуйте другой запрос.</div>';
                        return;
                    }
                    listEl.innerHTML = items.map((g, i) => renderSuggestItem(g, i)).join('');
                    listEl.querySelectorAll('.rgp-suggest-item').forEach(el => {
                        el.addEventListener('click', () => {
                            const idx = parseInt(el.getAttribute('data-index'), 10);
                            const picked = items[idx];
                            if (picked) onPick(picked);
                        });
                    });
                }

                renderList(initialSuggestions);

                searchInput.addEventListener('input', () => {
                    const q = searchInput.value.trim();
                    if (!q) {
                        renderList(initialSuggestions);
                        return;
                    }
                    const results = filterByQuery(q, db);
                    renderList(results);
                });

                return block;
            }

            function createBlock(game, options) {
                options = options || {};
                const onBack = options.onBack;

                const block = document.createElement('div');
                block.id = 'ripper-game-block';

                const hasComment = game.comment && game.comment.trim() !== '';
                const hasRank = game.rang && game.rang !== '_' && game.rang.trim() !== '';
                const isPlanned = game.rang === '_' || (!hasComment && !hasRank);

                let statusText;
                if (isPlanned) {
                    statusText = 'В планах';
                } else if (hasComment && hasRank) {
                    statusText = 'Отзыв и оценка';
                } else if (hasComment) {
                    statusText = 'Отзыв';
                } else {
                    statusText = 'Оценка';
                }

                const rankHtml = hasRank ? `
                    <div class="rgp-rank rank-${game.rang}">
                        <span>${game.rang}</span>
                    </div>
                ` : '';

                const bodyHtml = hasComment && !isPlanned
                    ? `<div class="rgp-body"><div class="rgp-quote">${escapeHtml(game.comment)}</div></div>`
                    : '';

                const dateHtml = game.date && game.date.trim() !== ''
                    ? `<div class="rgp-date">
                            <svg viewBox="0 0 24 24"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/></svg>
                            ${escapeHtml(game.date)}
                        </div>`
                    : '<div></div>';

                const reviewUrl = `${SITE_URL}/games.html?game=${slugify(game.title)}`;

                const backBtnHtml = onBack
                    ? `<button class="rgp-back" type="button">
                            <svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
                            Это не то
                        </button>`
                    : '';

                block.innerHTML = `
                    <div class="rgp-header">
                        <div class="rgp-info">
                            <div class="rgp-name">RIPSITE</div>
                            <div class="rgp-status">
                                <span>${statusText}</span>
                            </div>
                        </div>
                        ${rankHtml}
                    </div>
                    ${bodyHtml}
                    <div class="rgp-footer">
                        ${dateHtml}
                        <div class="rgp-footer-actions">
                            ${backBtnHtml}
                            <a class="rgp-link" href="${reviewUrl}" target="_blank" rel="noopener noreferrer">
                                <svg viewBox="0 0 24 24"><path d="M14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7zM19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7z"/></svg>
                                Открыть на RIPSITE
                            </a>
                        </div>
                    </div>
                `;

                if (onBack) {
                    const backBtn = block.querySelector('.rgp-back');
                    if (backBtn) backBtn.addEventListener('click', onBack);
                }

                return block;
            }

            function findInsertTarget() {
                const targets = [
                    '.game_area_purchase_game_wrapper',
                    '.game_area_purchase',
                    '#game_area_purchase',
                    '.glance_ctn',
                    '.apphub_AppName',
                    '#game_area_description'
                ];

                for (const sel of targets) {
                    const el = document.querySelector(sel);
                    if (el && el.parentNode) return el;
                }
                return null;
            }

            function insertBlock(block) {
                const el = findInsertTarget();
                if (el) {
                    el.parentNode.insertBefore(block, el.nextSibling);
                    return true;
                }
                return false;
            }

            function waitForElement(selector, timeout = 10000) {
                return new Promise((resolve, reject) => {
                    const el = document.querySelector(selector);
                    if (el) return resolve(el);
                    const observer = new MutationObserver(() => {
                        const el = document.querySelector(selector);
                        if (el) {
                            observer.disconnect();
                            resolve(el);
                        }
                    });
                    observer.observe(document.body, { childList: true, subtree: true });
                    setTimeout(() => {
                        observer.disconnect();
                        reject(new Error('Timeout waiting for ' + selector));
                    }, timeout);
                });
            }

            function fetchDatabase() {
                const base = getBaseUrl();
                const url = base + '/BD/game_database.json';
                return gmFetchJson(url, DB_TIMEOUT_MS);
            }

            function removeAll() {
                ['ripper-game-block', 'ripper-game-skeleton', 'ripper-game-suggest'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.remove();
                });
                const offer = document.getElementById('ripper-mirror-offer-game');
                if (offer) offer.remove();
            }

            function insertOffer(kind, skeleton, onRetry, onMirror, errorText) {
                const host = skeleton && skeleton.parentNode ? skeleton : findInsertTarget();
                if (!host || !host.parentNode) return null;
                return showMirrorOffer(kind, host, onRetry, onMirror, errorText);
            }

            async function init() {
                injectStyles();
                removeAll();

                let steamTitle = getSteamTitle();
                if (!steamTitle) {
                    await waitForElement('.apphub_AppName').catch(() => {});
                    steamTitle = getSteamTitle();
                }
                if (!steamTitle) return;

                const skeleton = createSkeleton();

                if (!insertBlock(skeleton)) {
                    await waitForElement('.game_area_purchase_game_wrapper, .glance_ctn, #game_area_description')
                        .then(() => insertBlock(skeleton))
                        .catch(() => {
                            document.body.insertBefore(skeleton, document.body.firstChild);
                        });
                }

                const requestMirror = (errText) => {
                    const offer = insertOffer(
                        'game',
                        skeleton,
                        () => {
                            const o = document.getElementById('ripper-mirror-offer-game');
                            if (o) o.remove();
                            removeAll();
                            init();
                        },
                        () => {
                            const o = document.getElementById('ripper-mirror-offer-game');
                            if (o) o.remove();
                            removeAll();
                            init();
                        },
                        errText
                    );
                    if (offer) {
                        const sk = document.getElementById('ripper-game-skeleton');
                        if (sk) sk.remove();
                    }
                };

                try {
                    const db = await fetchDatabase();
                    const currentSk = document.getElementById('ripper-game-skeleton');
                    if (!currentSk) return;

                    function replaceWithSuggest() {
                        const current = document.getElementById('ripper-game-suggest')
                            || document.getElementById('ripper-game-block')
                            || document.getElementById('ripper-game-skeleton');
                        if (!current || !current.parentNode) return;

                        const suggestions = findSuggestions(steamTitle, db);
                        const suggestBlock = createSuggestBlock(
                            steamTitle,
                            suggestions,
                            db,
                            (picked) => {
                                const cur = document.getElementById('ripper-game-suggest');
                                if (!cur) return;
                                const block = createBlock(picked, { onBack: () => replaceWithSuggest() });
                                cur.parentNode.replaceChild(block, cur);
                            }
                        );
                        current.parentNode.replaceChild(suggestBlock, current);
                    }

                    function replaceWithBlock(game) {
                        const cur = document.getElementById('ripper-game-suggest')
                            || document.getElementById('ripper-game-block')
                            || document.getElementById('ripper-game-skeleton');
                        if (!cur || !cur.parentNode) return;
                        const block = createBlock(game);
                        cur.parentNode.replaceChild(block, cur);
                    }

                    let exact = null;
                    const normSteam = normalizeTitle(steamTitle);
                    for (const g of db) {
                        if (normalizeTitle(g.title) === normSteam) { exact = g; break; }
                    }

                    if (exact) {
                        replaceWithBlock(exact);
                    } else {
                        replaceWithSuggest();
                    }
                } catch (e) {
                    console.warn('RIPMORE Steam:', e);
                    const errText = (e && e.message) ? e.message : 'Ошибка загрузки данных';
                    requestMirror(errText);
                }
            }

            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', init);
            } else {
                init();
            }

            let lastUrl = location.href;
            new MutationObserver(() => {
                if (location.href !== lastUrl) {
                    lastUrl = location.href;
                    removeAll();
                    setTimeout(init, 600);
                }
            }).observe(document, { subtree: true, childList: true });
        })();
    }

    /* =========================================================================
       ЧАСТЬ 3
       ========================================================================= */

    if (IS_SHIKIMORI && isSiteInfoEnabled() && isEnabled('shikimori_review')) {
        (function initShikimori() {
            const SITE_URL = 'https://ripsite666.netlify.app';
            const THEME = {
                bg:          '#09090f',
                card:        '#101015',
                accent:      '#c11f2b',
                accentHover: '#d4232f',
                text:        '#e0e0ff',
                textMuted:   '#a0a0cc',
                border:      '#1e1e28',
            };
            const FONT = "'Inter', system-ui, -apple-system, sans-serif";
            const FONT_TITLE = "'Orbitron', 'Inter', sans-serif";

            function injectStyles() {
                if (document.getElementById('ripper-anime-styles')) return;
                const style = document.createElement('style');
                style.id = 'ripper-anime-styles';
                style.textContent = `
                    #ripper-anime-block,
                    #ripper-anime-skeleton,
                    #ripper-anime-suggest {
                        font-family: ${FONT};
                        background: ${THEME.card};
                        border: 1px solid ${THEME.border};
                        border-radius: 18px;
                        padding: 0;
                        margin: 24px 0;
                        color: ${THEME.text};
                        box-shadow: 0 12px 48px rgba(0,0,0,0.6);
                        position: relative;
                        overflow: hidden;
                        line-height: 1.6;
                        isolation: isolate;
                        box-sizing: border-box;
                        width: 100%;
                        max-width: 100%;
                    }

                    #ripper-anime-block *,
                    #ripper-anime-skeleton *,
                    #ripper-anime-suggest * {
                        box-sizing: border-box;
                    }

                    #ripper-anime-block,
                    #ripper-anime-suggest {
                        animation: rapFadeIn 0.4s ease-out;
                    }

                    @keyframes rapFadeIn {
                        from { opacity: 0; transform: translateY(8px); }
                        to   { opacity: 1; transform: translateY(0); }
                    }

                    @keyframes rapShimmer {
                        0%   { background-position: 200% 0; }
                        100% { background-position: -200% 0; }
                    }

                    #ripper-anime-skeleton .rap-sk-header {
                        display: flex;
                        align-items: center;
                        gap: 14px;
                        padding: 20px 24px 16px;
                        border-bottom: 1px solid ${THEME.border};
                        background: ${THEME.bg};
                    }

                    #ripper-anime-skeleton .rap-sk-info {
                        display: flex;
                        flex-direction: column;
                        gap: 8px;
                        flex: 1;
                        min-width: 0;
                    }

                    #ripper-anime-skeleton .rap-sk-line {
                        background: linear-gradient(90deg, ${THEME.border} 0%, #2a2a38 50%, ${THEME.border} 100%);
                        background-size: 200% 100%;
                        border-radius: 6px;
                        animation: rapShimmer 1.4s ease-in-out infinite;
                    }

                    #ripper-anime-skeleton .rap-sk-name {
                        height: 18px;
                        width: 100px;
                    }

                    #ripper-anime-skeleton .rap-sk-status {
                        height: 11px;
                        width: 140px;
                        opacity: 0.7;
                    }

                    #ripper-anime-skeleton .rap-sk-rank {
                        width: 54px;
                        height: 54px;
                        flex-shrink: 0;
                        clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
                        background: linear-gradient(90deg, ${THEME.border} 0%, #2a2a38 50%, ${THEME.border} 100%);
                        background-size: 200% 100%;
                        animation: rapShimmer 1.4s ease-in-out infinite;
                    }

                    #ripper-anime-skeleton .rap-sk-body {
                        padding: 20px 24px 22px;
                        display: flex;
                        flex-direction: column;
                        gap: 10px;
                    }

                    #ripper-anime-skeleton .rap-sk-text {
                        height: 12px;
                        width: 100%;
                    }

                    #ripper-anime-skeleton .rap-sk-text.short-1 { width: 92%; }
                    #ripper-anime-skeleton .rap-sk-text.short-2 { width: 78%; }
                    #ripper-anime-skeleton .rap-sk-text.short-3 { width: 60%; }

                    #ripper-anime-skeleton .rap-sk-footer {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        gap: 12px;
                        padding: 14px 24px 18px;
                        border-top: 1px solid ${THEME.border};
                        background: ${THEME.bg};
                        flex-wrap: wrap;
                    }

                    #ripper-anime-skeleton .rap-sk-date {
                        height: 12px;
                        width: 90px;
                        border-radius: 6px;
                        background: linear-gradient(90deg, ${THEME.border} 0%, #2a2a38 50%, ${THEME.border} 100%);
                        background-size: 200% 100%;
                        animation: rapShimmer 1.4s ease-in-out infinite;
                    }

                    #ripper-anime-skeleton .rap-sk-btn {
                        height: 34px;
                        width: 170px;
                        border-radius: 10px;
                        background: linear-gradient(90deg, ${THEME.border} 0%, #2a2a38 50%, ${THEME.border} 100%);
                        background-size: 200% 100%;
                        animation: rapShimmer 1.4s ease-in-out infinite;
                    }

                    #ripper-anime-block .rap-header,
                    #ripper-anime-suggest .rap-header {
                        display: flex;
                        align-items: center;
                        gap: 14px;
                        padding: 20px 24px 16px;
                        border-bottom: 1px solid ${THEME.border};
                        background: ${THEME.bg};
                    }

                    #ripper-anime-block .rap-info,
                    #ripper-anime-suggest .rap-info {
                        display: flex;
                        flex-direction: column;
                        gap: 3px;
                        min-width: 0;
                        flex: 1;
                    }

                    #ripper-anime-block .rap-name,
                    #ripper-anime-suggest .rap-name {
                        font-family: ${FONT_TITLE};
                        font-weight: 700;
                        font-size: 1.1rem;
                        letter-spacing: 0.8px;
                        color: white;
                        text-shadow: 0 1px 4px rgba(0,0,0,0.6);
                        line-height: 1.2;
                    }

                    #ripper-anime-block .rap-status,
                    #ripper-anime-suggest .rap-status {
                        display: inline-flex;
                        align-items: center;
                        font-family: ${FONT_TITLE};
                        font-weight: 700;
                        font-size: 0.72rem;
                        letter-spacing: 1px;
                        text-transform: uppercase;
                        color: ${THEME.textMuted};
                        line-height: 1;
                    }

                    #ripper-anime-block .rap-rank {
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        font-family: ${FONT_TITLE};
                        font-size: 1.6rem;
                        font-weight: 900;
                        color: white;
                        width: 54px;
                        height: 54px;
                        text-shadow: 0 3px 12px rgba(0,0,0,0.7);
                        clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
                        position: relative;
                        flex-shrink: 0;
                        filter: drop-shadow(0 4px 12px rgba(0,0,0,0.5));
                    }

                    #ripper-anime-block .rap-rank::before {
                        content: '';
                        position: absolute;
                        inset: 4px;
                        clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
                        background: rgba(16,16,21,0.9);
                        z-index: 1;
                    }

                    #ripper-anime-block .rap-rank::after {
                        content: '';
                        position: absolute;
                        inset: 7px;
                        clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
                        background: rgba(16,16,21,0.98);
                        z-index: 1;
                    }

                    #ripper-anime-block .rap-rank > span {
                        position: relative;
                        z-index: 3;
                        line-height: 1;
                    }

                    #ripper-anime-block .rap-rank.rank-10 { background: linear-gradient(135deg, #c11f2b, #6a0f17); }
                    #ripper-anime-block .rap-rank.rank-9  { background: linear-gradient(135deg, #c11f2b, #8a1520); }
                    #ripper-anime-block .rap-rank.rank-8  { background: linear-gradient(135deg, #8a1520, #4a0a10); }
                    #ripper-anime-block .rap-rank.rank-7  { background: linear-gradient(135deg, #5a3a7a, #2a1a3a); }
                    #ripper-anime-block .rap-rank.rank-6  { background: linear-gradient(135deg, #2a4a5a, #152530); }
                    #ripper-anime-block .rap-rank.rank-5  { background: linear-gradient(135deg, #3a3a5a, #1a1a2e); }
                    #ripper-anime-block .rap-rank.rank-4  { background: linear-gradient(135deg, #2a2a3a, #151520); }
                    #ripper-anime-block .rap-rank.rank-3  { background: linear-gradient(135deg, #2a2a3a, #151520); }
                    #ripper-anime-block .rap-rank.rank-2  { background: linear-gradient(135deg, #2a2a3a, #151520); }
                    #ripper-anime-block .rap-rank.rank-1  { background: linear-gradient(135deg, #2a2a3a, #151520); }
                    #ripper-anime-block .rap-rank.rank-_  { background: linear-gradient(135deg, #2a2a3a, #151520); }

                    #ripper-anime-block .rap-body {
                        padding: 20px 24px 22px;
                        background: ${THEME.card};
                    }

                    #ripper-anime-block .rap-quote {
                        font-size: 0.95rem;
                        line-height: 1.7;
                        color: ${THEME.text};
                        white-space: pre-wrap;
                        word-break: break-word;
                        border-left: 2px solid rgba(193,31,43,0.35);
                        padding-left: 14px;
                        max-height: 360px;
                        overflow-y: auto;
                        scrollbar-width: thin;
                        scrollbar-color: ${THEME.accent} ${THEME.border};
                    }

                    #ripper-anime-block .rap-quote::-webkit-scrollbar {
                        width: 6px;
                    }
                    #ripper-anime-block .rap-quote::-webkit-scrollbar-track {
                        background: ${THEME.border};
                        border-radius: 3px;
                    }
                    #ripper-anime-block .rap-quote::-webkit-scrollbar-thumb {
                        background: ${THEME.accent};
                        border-radius: 3px;
                    }

                    #ripper-anime-block .rap-footer,
                    #ripper-anime-suggest .rap-footer {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        gap: 12px;
                        padding: 14px 24px 18px;
                        border-top: 1px solid ${THEME.border};
                        background: ${THEME.bg};
                        flex-wrap: wrap;
                    }

                    #ripper-anime-block .rap-date {
                        font-size: 0.8rem;
                        color: ${THEME.textMuted};
                        font-style: italic;
                        letter-spacing: 0.3px;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }

                    #ripper-anime-block .rap-date svg {
                        width: 14px;
                        height: 14px;
                        fill: currentColor;
                        opacity: 0.7;
                    }

                    #ripper-anime-block .rap-link,
                    #ripper-anime-suggest .rap-link {
                        display: inline-flex;
                        align-items: center;
                        gap: 8px;
                        font-family: ${FONT_TITLE};
                        font-weight: 700;
                        font-size: 0.78rem;
                        letter-spacing: 1px;
                        text-transform: uppercase;
                        color: white;
                        text-decoration: none;
                        padding: 9px 18px;
                        border-radius: 10px;
                        background: ${THEME.accent};
                        box-shadow: 0 4px 14px rgba(193,31,43,0.3);
                        transition: background 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
                        border: none;
                        cursor: pointer;
                    }

                    #ripper-anime-block .rap-link:hover,
                    #ripper-anime-suggest .rap-link:hover {
                        background: ${THEME.accentHover};
                        transform: translateY(-1px);
                        box-shadow: 0 6px 20px rgba(193,31,43,0.45);
                        color: white;
                        text-decoration: none;
                    }

                    #ripper-anime-block .rap-link svg,
                    #ripper-anime-suggest .rap-link svg {
                        width: 13px;
                        height: 13px;
                        fill: currentColor;
                    }

                    #ripper-anime-block .rap-footer-actions {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        flex-wrap: wrap;
                    }

                    #ripper-anime-block .rap-back {
                        display: inline-flex;
                        align-items: center;
                        gap: 8px;
                        font-family: ${FONT_TITLE};
                        font-weight: 700;
                        font-size: 0.75rem;
                        letter-spacing: 1px;
                        text-transform: uppercase;
                        color: ${THEME.textMuted};
                        background: transparent;
                        border: 1px solid ${THEME.border};
                        padding: 9px 16px;
                        border-radius: 10px;
                        cursor: pointer;
                        transition: color 0.2s ease, border-color 0.2s ease, background 0.2s ease;
                    }

                    #ripper-anime-block .rap-back:hover {
                        color: white;
                        border-color: ${THEME.accent};
                        background: rgba(193,31,43,0.12);
                    }

                    #ripper-anime-block .rap-back svg {
                        width: 13px;
                        height: 13px;
                        fill: currentColor;
                    }

                    #ripper-anime-suggest .rap-suggest-body {
                        padding: 20px 24px 22px;
                        display: flex;
                        flex-direction: column;
                        gap: 14px;
                        overflow: hidden;
                    }

                    #ripper-anime-suggest .rap-suggest-text {
                        font-size: 0.93rem;
                        line-height: 1.6;
                        color: ${THEME.text};
                        word-break: break-word;
                    }

                    #ripper-anime-suggest .rap-suggest-text strong {
                        color: white;
                        font-weight: 600;
                    }

                    #ripper-anime-suggest .rap-suggest-search {
                        position: relative;
                        width: 100%;
                        max-width: 100%;
                    }

                    #ripper-anime-suggest .rap-suggest-search-input {
                        width: 100%;
                        max-width: 100%;
                        padding: 12px 16px 12px 42px;
                        background: ${THEME.bg};
                        border: 1px solid ${THEME.border};
                        border-radius: 12px;
                        color: ${THEME.text};
                        font-family: ${FONT};
                        font-size: 0.92rem;
                        outline: none;
                        transition: border-color 0.2s ease, box-shadow 0.2s ease;
                    }

                    #ripper-anime-suggest .rap-suggest-search-input::placeholder {
                        color: ${THEME.textMuted};
                        opacity: 0.7;
                    }

                    #ripper-anime-suggest .rap-suggest-search-input:focus {
                        border-color: ${THEME.accent};
                        box-shadow: 0 0 0 3px rgba(193,31,43,0.18);
                    }

                    #ripper-anime-suggest .rap-suggest-search-icon {
                        position: absolute;
                        left: 14px;
                        top: 50%;
                        transform: translateY(-50%);
                        width: 16px;
                        height: 16px;
                        fill: ${THEME.textMuted};
                        pointer-events: none;
                        opacity: 0.7;
                    }

                    #ripper-anime-suggest .rap-suggest-list {
                        display: flex;
                        flex-direction: column;
                        gap: 8px;
                        max-height: 320px;
                        overflow-y: auto;
                        overflow-x: hidden;
                        scrollbar-width: thin;
                        scrollbar-color: ${THEME.accent} ${THEME.border};
                        padding-right: 4px;
                        width: 100%;
                        max-width: 100%;
                    }

                    #ripper-anime-suggest .rap-suggest-list::-webkit-scrollbar {
                        width: 6px;
                    }
                    #ripper-anime-suggest .rap-suggest-list::-webkit-scrollbar-track {
                        background: ${THEME.border};
                        border-radius: 3px;
                    }
                    #ripper-anime-suggest .rap-suggest-list::-webkit-scrollbar-thumb {
                        background: ${THEME.accent};
                        border-radius: 3px;
                    }

                    #ripper-anime-suggest .rap-suggest-item {
                        display: flex;
                        align-items: center;
                        gap: 14px;
                        padding: 12px 16px;
                        background: ${THEME.bg};
                        border: 1px solid ${THEME.border};
                        border-radius: 12px;
                        cursor: pointer;
                        transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
                        user-select: none;
                        width: 100%;
                        max-width: 100%;
                    }

                    #ripper-anime-suggest .rap-suggest-item:hover {
                        background: rgba(193,31,43,0.12);
                        border-color: ${THEME.accent};
                        transform: translateY(-1px);
                    }

                    #ripper-anime-suggest .rap-suggest-item-title {
                        flex: 1;
                        font-size: 0.95rem;
                        font-weight: 600;
                        color: ${THEME.text};
                        min-width: 0;
                        word-break: break-word;
                    }

                    #ripper-anime-suggest .rap-suggest-item-rank {
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        font-family: ${FONT_TITLE};
                        font-size: 1rem;
                        font-weight: 900;
                        color: white;
                        width: 34px;
                        height: 34px;
                        text-shadow: 0 2px 8px rgba(0,0,0,0.7);
                        clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
                        position: relative;
                        flex-shrink: 0;
                    }

                    #ripper-anime-suggest .rap-suggest-item-rank::before {
                        content: '';
                        position: absolute;
                        inset: 3px;
                        clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
                        background: rgba(16,16,21,0.9);
                        z-index: 1;
                    }

                    #ripper-anime-suggest .rap-suggest-item-rank::after {
                        content: '';
                        position: absolute;
                        inset: 5px;
                        clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
                        background: rgba(16,16,21,0.98);
                        z-index: 1;
                    }

                    #ripper-anime-suggest .rap-suggest-item-rank > span {
                        position: relative;
                        z-index: 3;
                        line-height: 1;
                    }

                    #ripper-anime-suggest .rap-suggest-item-rank.rank-10 { background: linear-gradient(135deg, #c11f2b, #6a0f17); }
                    #ripper-anime-suggest .rap-suggest-item-rank.rank-9  { background: linear-gradient(135deg, #c11f2b, #8a1520); }
                    #ripper-anime-suggest .rap-suggest-item-rank.rank-8  { background: linear-gradient(135deg, #8a1520, #4a0a10); }
                    #ripper-anime-suggest .rap-suggest-item-rank.rank-7  { background: linear-gradient(135deg, #5a3a7a, #2a1a3a); }
                    #ripper-anime-suggest .rap-suggest-item-rank.rank-6  { background: linear-gradient(135deg, #2a4a5a, #152530); }
                    #ripper-anime-suggest .rap-suggest-item-rank.rank-5  { background: linear-gradient(135deg, #3a3a5a, #1a1a2e); }
                    #ripper-anime-suggest .rap-suggest-item-rank.rank-4  { background: linear-gradient(135deg, #2a2a3a, #151520); }
                    #ripper-anime-suggest .rap-suggest-item-rank.rank-3  { background: linear-gradient(135deg, #2a2a3a, #151520); }
                    #ripper-anime-suggest .rap-suggest-item-rank.rank-2  { background: linear-gradient(135deg, #2a2a3a, #151520); }
                    #ripper-anime-suggest .rap-suggest-item-rank.rank-1  { background: linear-gradient(135deg, #2a2a3a, #151520); }
                    #ripper-anime-suggest .rap-suggest-item-rank.rank-_  { background: linear-gradient(135deg, #2a2a3a, #151520); }

                    #ripper-anime-suggest .rap-suggest-empty {
                        padding: 20px 16px;
                        text-align: center;
                        color: ${THEME.textMuted};
                        font-size: 0.9rem;
                        font-style: italic;
                    }

                    @media (max-width: 640px) {
                        #ripper-anime-block .rap-header,
                        #ripper-anime-skeleton .rap-sk-header,
                        #ripper-anime-suggest .rap-header {
                            padding: 16px 16px 14px;
                            gap: 12px;
                        }
                        #ripper-anime-block .rap-name,
                        #ripper-anime-suggest .rap-name {
                            font-size: 1rem;
                        }
                        #ripper-anime-block .rap-rank,
                        #ripper-anime-skeleton .rap-sk-rank {
                            width: 46px;
                            height: 46px;
                            font-size: 1.4rem;
                        }
                        #ripper-anime-block .rap-body,
                        #ripper-anime-skeleton .rap-sk-body,
                        #ripper-anime-suggest .rap-suggest-body {
                            padding: 16px 16px 18px;
                        }
                        #ripper-anime-block .rap-quote {
                            font-size: 0.88rem;
                            max-height: 280px;
                        }
                        #ripper-anime-block .rap-footer,
                        #ripper-anime-skeleton .rap-sk-footer,
                        #ripper-anime-suggest .rap-footer {
                            padding: 12px 16px 16px;
                            flex-direction: column;
                            align-items: stretch;
                        }
                        #ripper-anime-block .rap-link,
                        #ripper-anime-suggest .rap-link {
                            justify-content: center;
                            width: 100%;
                        }
                        #ripper-anime-block .rap-footer-actions {
                            flex-direction: column;
                            align-items: stretch;
                            width: 100%;
                        }
                        #ripper-anime-block .rap-back {
                            justify-content: center;
                            width: 100%;
                        }
                        #ripper-anime-skeleton .rap-sk-btn {
                            width: 100%;
                        }
                    }
                `;
                (document.head || document.documentElement).appendChild(style);
            }

            function createSkeleton() {
                const sk = document.createElement('div');
                sk.id = 'ripper-anime-skeleton';
                sk.innerHTML = `
                    <div class="rap-sk-header">
                        <div class="rap-sk-info">
                            <div class="rap-sk-line rap-sk-name"></div>
                            <div class="rap-sk-line rap-sk-status"></div>
                        </div>
                        <div class="rap-sk-rank"></div>
                    </div>
                    <div class="rap-sk-body">
                        <div class="rap-sk-line rap-sk-text"></div>
                        <div class="rap-sk-line rap-sk-text short-1"></div>
                        <div class="rap-sk-line rap-sk-text short-2"></div>
                        <div class="rap-sk-line rap-sk-text short-3"></div>
                    </div>
                    <div class="rap-sk-footer">
                        <div class="rap-sk-date"></div>
                        <div class="rap-sk-btn"></div>
                    </div>
                `;
                return sk;
            }

            function normalizeTitle(title) {
                return title
                    .toLowerCase()
                    .replace(/[™®©]/g, '')
                    .replace(/[:\-–—]/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();
            }

            function escapeHtml(text) {
                const div = document.createElement('div');
                div.textContent = text;
                return div.innerHTML;
            }

            function slugify(title) {
                return encodeURIComponent(title);
            }

            function getShikimoriTitle() {
                const el = document.querySelector('header.head h1') ||
                           document.querySelector('header.head h2');
                if (!el) return '';

                let title = el.textContent.trim();

                const ruEl = el.querySelector('.name-ru');
                if (ruEl && ruEl.textContent.trim()) {
                    return ruEl.textContent.trim();
                }

                const slashIdx = title.indexOf('/');
                if (slashIdx !== -1) {
                    title = title.slice(0, slashIdx).trim();
                }

                return title;
            }

            function scoreMatch(shikiTitle, animeTitle) {
                const normShiki = normalizeTitle(shikiTitle);
                const normDb = normalizeTitle(animeTitle);
                if (normDb === normShiki) return 100;

                const shikiWords = normShiki.split(' ').filter(w => w.length > 1);
                const dbWords = normDb.split(' ').filter(w => w.length > 1);
                if (shikiWords.length === 0 || dbWords.length === 0) return 0;

                let score = 0;
                for (const sw of shikiWords) {
                    for (const dw of dbWords) {
                        if (sw === dw) score += 2;
                        else if (sw.length > 3 && dw.length > 3 && (sw.startsWith(dw) || dw.startsWith(sw))) score += 1.2;
                        else if (sw.length > 3 && dw.length > 3 && (sw.includes(dw) || dw.includes(sw))) score += 0.8;
                    }
                }
                const maxLen = Math.max(shikiWords.length, dbWords.length);
                return (score / maxLen) * 100;
            }

            function findSuggestions(shikiTitle, db) {
                const scored = [];
                for (const anime of db) {
                    const s = scoreMatch(shikiTitle, anime.title);
                    if (s >= 30) scored.push({ anime, score: s });
                }
                scored.sort((a, b) => b.score - a.score);
                return scored.slice(0, 10).map(s => s.anime);
            }

            function filterByQuery(query, db) {
                const q = normalizeTitle(query);
                if (!q) return [];
                const words = q.split(' ').filter(w => w.length > 0);
                const scored = [];
                for (const anime of db) {
                    const normDb = normalizeTitle(anime.title);
                    let score = 0;
                    let allMatch = true;
                    for (const w of words) {
                        if (normDb.includes(w)) score += 2;
                        else if (w.length > 2) {
                            const dbWords = normDb.split(' ');
                            let partial = false;
                            for (const dw of dbWords) {
                                if (dw.startsWith(w) || w.startsWith(dw)) { partial = true; break; }
                            }
                            if (partial) score += 1;
                            else allMatch = false;
                        }
                    }
                    if (allMatch || words.length === 1) {
                        if (score > 0) scored.push({ anime, score });
                    }
                }
                scored.sort((a, b) => b.score - a.score);
                return scored.slice(0, 20).map(s => s.anime);
            }

            function renderSuggestItem(anime, index) {
                const rankClass = anime.rating && anime.rating !== '_' ? `rank-${anime.rating}` : 'rank-_';
                const rankDisplay = anime.rating && anime.rating !== '_' ? anime.rating : '?';
                return `
                    <div class="rap-suggest-item" data-index="${index}">
                        <div class="rap-suggest-item-title">${escapeHtml(anime.title)}</div>
                        <div class="rap-suggest-item-rank ${rankClass}"><span>${rankDisplay}</span></div>
                    </div>
                `;
            }

            function createSuggestBlock(shikiTitle, initialSuggestions, db, onPick) {
                const block = document.createElement('div');
                block.id = 'ripper-anime-suggest';

                block.innerHTML = `
                    <div class="rap-header">
                        <div class="rap-info">
                            <div class="rap-name">RIPSITE</div>
                            <div class="rap-status"><span>Выбор аниме</span></div>
                        </div>
                    </div>
                    <div class="rap-suggest-body">
                        <div class="rap-suggest-text">
                            Точного совпадения для <strong>«${escapeHtml(shikiTitle)}»</strong> нет.
                            Возможно, на сайте аниме называется по-другому. Выберите вариант из списка или найдите через поиск.
                        </div>
                        <div class="rap-suggest-search">
                            <svg class="rap-suggest-search-icon" viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                            <input type="text" class="rap-suggest-search-input" placeholder="Поиск аниме на сайте...">
                        </div>
                        <div class="rap-suggest-list"></div>
                    </div>
                `;

                const listEl = block.querySelector('.rap-suggest-list');
                const searchInput = block.querySelector('.rap-suggest-search-input');

                function renderList(items) {
                    if (items.length === 0) {
                        listEl.innerHTML = '<div class="rap-suggest-empty">Ничего не найдено. Попробуйте другой запрос.</div>';
                        return;
                    }
                    listEl.innerHTML = items.map((g, i) => renderSuggestItem(g, i)).join('');
                    listEl.querySelectorAll('.rap-suggest-item').forEach(el => {
                        el.addEventListener('click', () => {
                            const idx = parseInt(el.getAttribute('data-index'), 10);
                            const picked = items[idx];
                            if (picked) onPick(picked);
                        });
                    });
                }

                renderList(initialSuggestions);

                searchInput.addEventListener('input', () => {
                    const q = searchInput.value.trim();
                    if (!q) {
                        renderList(initialSuggestions);
                        return;
                    }
                    const results = filterByQuery(q, db);
                    renderList(results);
                });

                return block;
            }

            function createBlock(anime, options) {
                options = options || {};
                const onBack = options.onBack;

                const block = document.createElement('div');
                block.id = 'ripper-anime-block';

                const hasReview = anime.review && anime.review.trim() !== '';
                const hasRating = anime.rating && anime.rating !== '_' && anime.rating.trim() !== '';
                const isPlanned = anime.rating === '_' || (!hasReview && !hasRating);

                let statusText;
                if (isPlanned) {
                    statusText = 'В планах';
                } else if (hasReview && hasRating) {
                    statusText = 'Отзыв и оценка';
                } else if (hasReview) {
                    statusText = 'Отзыв';
                } else {
                    statusText = 'Оценка';
                }

                const rankHtml = hasRating ? `
                    <div class="rap-rank rank-${anime.rating}">
                        <span>${anime.rating}</span>
                    </div>
                ` : '';

                const bodyHtml = hasReview && !isPlanned
                    ? `<div class="rap-body"><div class="rap-quote">${escapeHtml(anime.review)}</div></div>`
                    : '';

                const dateHtml = anime.date && anime.date.trim() !== ''
                    ? `<div class="rap-date">
                            <svg viewBox="0 0 24 24"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/></svg>
                            ${escapeHtml(anime.date)}
                        </div>`
                    : '<div></div>';

                const reviewUrl = `${SITE_URL}/anime.html?anime=${slugify(anime.slug || anime.title)}`;

                const backBtnHtml = onBack
                    ? `<button class="rap-back" type="button">
                            <svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
                            Это не то
                        </button>`
                    : '';

                block.innerHTML = `
                    <div class="rap-header">
                        <div class="rap-info">
                            <div class="rap-name">RIPSITE</div>
                            <div class="rap-status">
                                <span>${statusText}</span>
                            </div>
                        </div>
                        ${rankHtml}
                    </div>
                    ${bodyHtml}
                    <div class="rap-footer">
                        ${dateHtml}
                        <div class="rap-footer-actions">
                            ${backBtnHtml}
                            <a class="rap-link" href="${reviewUrl}" target="_blank" rel="noopener noreferrer">
                                <svg viewBox="0 0 24 24"><path d="M14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7zM19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7z"/></svg>
                                Открыть на RIPSITE
                            </a>
                        </div>
                    </div>
                `;

                if (onBack) {
                    const backBtn = block.querySelector('.rap-back');
                    if (backBtn) backBtn.addEventListener('click', onBack);
                }

                return block;
            }

            function findInsertTarget() {
                const el = document.querySelector('.resources-loader[data-dynamic="postloaded"]');
                if (el && el.parentNode) return el;
                return null;
            }

            function insertBlock(block) {
                const el = findInsertTarget();
                if (el && el.parentNode) {
                    el.parentNode.insertBefore(block, el);
                    return true;
                }
                return false;
            }

            function waitForElement(selector, timeout = 10000) {
                return new Promise((resolve, reject) => {
                    const el = document.querySelector(selector);
                    if (el) return resolve(el);
                    const observer = new MutationObserver(() => {
                        const el = document.querySelector(selector);
                        if (el) {
                            observer.disconnect();
                            resolve(el);
                        }
                    });
                    observer.observe(document.body, { childList: true, subtree: true });
                    setTimeout(() => {
                        observer.disconnect();
                        reject(new Error('Timeout waiting for ' + selector));
                    }, timeout);
                });
            }

            function fetchDatabase() {
                const base = getBaseUrl();
                const url = base + '/BD/anime_database.json';
                return gmFetchJson(url, DB_TIMEOUT_MS);
            }

            function removeAll() {
                ['ripper-anime-block', 'ripper-anime-skeleton', 'ripper-anime-suggest'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.remove();
                });
                const offer = document.getElementById('ripper-mirror-offer-anime');
                if (offer) offer.remove();
            }

            function getAllAnime(db) {
                const result = [];
                for (const key of ['script_anime', 'offline']) {
                    if (db[key] && Array.isArray(db[key])) {
                        for (const item of db[key]) {
                            result.push({
                                title: item.title,
                                rating: item.rating ? String(item.rating) : item.rang || '_',
                                review: item.review || item.comment || '',
                                date: item.date || '',
                                slug: item.slug || item.image || '',
                            });
                        }
                    }
                }
                if (db.streamed && Array.isArray(db.streamed)) {
                    for (const item of db.streamed) {
                        let ratingVal = '_';
                        if (item.rating) {
                            const m = item.rating.match(/(\d+)\s*\/\s*10/);
                            if (m) ratingVal = m[1];
                        }
                        result.push({
                            title: item.title,
                            rating: ratingVal,
                            review: item.review || '',
                            date: item.date || '',
                            slug: item.slug || '',
                        });
                    }
                }
                return result;
            }

            function insertOffer(skeleton, onRetry, onMirror, errorText) {
                const host = skeleton && skeleton.parentNode ? skeleton : findInsertTarget();
                if (!host || !host.parentNode) return null;
                return showMirrorOffer('anime', host, onRetry, onMirror, errorText);
            }

            async function init() {
                injectStyles();
                removeAll();

                let shikiTitle = getShikimoriTitle();
                if (!shikiTitle) {
                    await waitForElement('header.head h1, header.head h2').catch(() => {});
                    shikiTitle = getShikimoriTitle();
                }
                if (!shikiTitle) return;

                const skeleton = createSkeleton();

                if (!insertBlock(skeleton)) {
                    await waitForElement('.resources-loader[data-dynamic="postloaded"]')
                        .then(() => insertBlock(skeleton))
                        .catch(() => {});
                }

                const requestMirror = (errText) => {
                    const offer = insertOffer(
                        skeleton,
                        () => {
                            const o = document.getElementById('ripper-mirror-offer-anime');
                            if (o) o.remove();
                            removeAll();
                            init();
                        },
                        () => {
                            const o = document.getElementById('ripper-mirror-offer-anime');
                            if (o) o.remove();
                            removeAll();
                            init();
                        },
                        errText
                    );
                    if (offer) {
                        const sk = document.getElementById('ripper-anime-skeleton');
                        if (sk) sk.remove();
                    }
                };

                try {
                    const db = await fetchDatabase();
                    const currentSk = document.getElementById('ripper-anime-skeleton');
                    if (!currentSk) return;

                    const allAnime = getAllAnime(db);

                    function replaceWithSuggest() {
                        const current = document.getElementById('ripper-anime-suggest')
                            || document.getElementById('ripper-anime-block')
                            || document.getElementById('ripper-anime-skeleton');
                        if (!current || !current.parentNode) return;

                        const suggestions = findSuggestions(shikiTitle, allAnime);
                        const suggestBlock = createSuggestBlock(
                            shikiTitle,
                            suggestions,
                            allAnime,
                            (picked) => {
                                const cur = document.getElementById('ripper-anime-suggest');
                                if (!cur) return;
                                const block = createBlock(picked, { onBack: () => replaceWithSuggest() });
                                cur.parentNode.replaceChild(block, cur);
                            }
                        );
                        current.parentNode.replaceChild(suggestBlock, current);
                    }

                    function replaceWithBlock(anime) {
                        const cur = document.getElementById('ripper-anime-suggest')
                            || document.getElementById('ripper-anime-block')
                            || document.getElementById('ripper-anime-skeleton');
                        if (!cur || !cur.parentNode) return;
                        const block = createBlock(anime);
                        cur.parentNode.replaceChild(block, cur);
                    }

                    let exact = null;
                    const normShiki = normalizeTitle(shikiTitle);
                    for (const g of allAnime) {
                        if (normalizeTitle(g.title) === normShiki) { exact = g; break; }
                    }

                    if (exact) {
                        replaceWithBlock(exact);
                    } else {
                        replaceWithSuggest();
                    }
                } catch (e) {
                    console.warn('RIPMORE Anime:', e);
                    const errText = (e && e.message) ? e.message : 'Ошибка загрузки данных';
                    requestMirror(errText);
                }
            }

            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', init);
            } else {
                init();
            }

            let lastUrl = location.href;
            new MutationObserver(() => {
                if (location.href !== lastUrl) {
                    lastUrl = location.href;
                    removeAll();
                    setTimeout(init, 600);
                }
            }).observe(document, { subtree: true, childList: true });
        })();
    }

    /* =========================================================================
       ЧАСТЬ 4
       ========================================================================= */

    if (IS_RIPSITE) {
        (function initRipsite() {
            const PROFILE_URL = 'https://steamcommunity.com/id/ripper_cmertanoc/';
            const AVATAR_URL = 'https://ripsite666.netlify.app/Files/Other/RIPPERSQUARE.png';
            const THEME = {
                bg:          '#09090f',
                card:        '#101015',
                accent:      '#c11f2b',
                accentHover: '#d4232f',
                text:        '#e0e0ff',
                textMuted:   '#a0a0cc',
                border:      '#1e1e28'
            };
            const FONT = "'Inter', system-ui, -apple-system, sans-serif";
            const FONT_TITLE = "'Orbitron', 'Inter', sans-serif";

            const IS_RIPMORE_PAGE = /\/ripmore(\.html)?$/i.test(location.pathname);

            if (!IS_RIPMORE_PAGE && isEnabled('steam_widget')) {
                (function initSteamWidget() {
                    function injectEarlyHide() {
                        if (document.getElementById('ripper-steam-early-hide')) return;
                        const style = document.createElement('style');
                        style.id = 'ripper-steam-early-hide';
                        style.textContent = `
                            body:not(.ripper-ready) .steam-widget-section,
                            body:not(.ripper-ready) .steam-widget-section * {
                                visibility: hidden !important;
                            }
                        `;
                        (document.head || document.documentElement).appendChild(style);
                    }

                    function markReady() {
                        if (document.body) {
                            document.body.classList.add('ripper-ready');
                        } else {
                            document.addEventListener('DOMContentLoaded', function() {
                                document.body.classList.add('ripper-ready');
                            }, { once: true });
                        }
                    }

                    function injectStyles() {
                        if (document.getElementById('ripper-steam-profile-styles')) return;
                        const style = document.createElement('style');
                        style.id = 'ripper-steam-profile-styles';
                        style.textContent = `
                            .ripper-steam-profile {
                                font-family: ${FONT};
                                background: ${THEME.card};
                                border: 1px solid ${THEME.border};
                                border-radius: 18px;
                                padding: 0;
                                margin: 0.5rem auto 2rem;
                                color: ${THEME.text};
                                box-shadow: 0 12px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(193,31,43,0.08);
                                position: relative;
                                overflow: hidden;
                                line-height: 1.6;
                                isolation: isolate;
                                box-sizing: border-box;
                                width: 100%;
                                max-width: 900px;
                                animation: rspFadeIn 0.5s ease-out;
                            }

                            .ripper-steam-profile * {
                                box-sizing: border-box;
                            }

                            @keyframes rspFadeIn {
                                from { opacity: 0; transform: translateY(10px); }
                                to   { opacity: 1; transform: translateY(0); }
                            }

                            .ripper-steam-profile-header {
                                display: flex;
                                align-items: center;
                                gap: 18px;
                                padding: 22px 28px 18px;
                                border-bottom: 1px solid ${THEME.border};
                                background: ${THEME.bg};
                                position: relative;
                            }

                            .ripper-steam-avatar-wrap {
                                position: relative;
                                flex-shrink: 0;
                                width: 72px;
                                height: 72px;
                                border-radius: 50%;
                                border: 3px solid ${THEME.accent};
                                box-shadow: 0 0 0 3px ${THEME.bg}, 0 0 20px rgba(193,31,43,0.4);
                                overflow: hidden;
                                background: ${THEME.border};
                            }

                            .ripper-steam-avatar {
                                width: 100%;
                                height: 100%;
                                object-fit: cover;
                                display: block;
                            }

                            .ripper-steam-info {
                                display: flex;
                                flex-direction: column;
                                gap: 6px;
                                min-width: 0;
                                flex: 1;
                            }

                            .ripper-steam-name {
                                font-family: ${FONT_TITLE};
                                font-weight: 700;
                                font-size: 1.35rem;
                                letter-spacing: 0.8px;
                                color: white;
                                text-shadow: 0 1px 4px rgba(0,0,0,0.6);
                                line-height: 1.2;
                                display: flex;
                                align-items: center;
                                gap: 10px;
                                flex-wrap: wrap;
                            }

                            .ripper-steam-name a {
                                color: white;
                                text-decoration: none;
                                transition: color 0.2s ease;
                            }

                            .ripper-steam-name a:hover {
                                color: ${THEME.accent};
                            }

                            .ripper-steam-status-row {
                                display: flex;
                                align-items: center;
                                gap: 10px;
                                flex-wrap: wrap;
                            }

                            .ripper-steam-status-badge {
                                display: inline-flex;
                                align-items: center;
                                gap: 8px;
                                font-family: ${FONT_TITLE};
                                font-weight: 700;
                                font-size: 0.75rem;
                                letter-spacing: 1px;
                                text-transform: uppercase;
                                color: ${THEME.textMuted};
                                padding: 5px 14px;
                                border-radius: 20px;
                                background: ${THEME.border};
                                border: 1px solid ${THEME.border};
                                transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
                            }

                            .ripper-steam-status-dot {
                                width: 10px;
                                height: 10px;
                                border-radius: 50%;
                                flex-shrink: 0;
                                background: #898989;
                                box-shadow: 0 0 6px rgba(137, 137, 137, 0.5);
                            }

                            .ripper-steam-status-badge.online .ripper-steam-status-dot {
                                background: #57cbde;
                                box-shadow: 0 0 8px rgba(87, 203, 222, 0.8);
                            }

                            .ripper-steam-status-badge.offline .ripper-steam-status-dot {
                                background: #898989;
                                box-shadow: 0 0 6px rgba(137, 137, 137, 0.5);
                            }

                            .ripper-steam-status-badge.in-game .ripper-steam-status-dot {
                                background: #90ba3c;
                                box-shadow: 0 0 8px rgba(144, 186, 60, 0.8);
                            }

                            .ripper-steam-status-badge.online {
                                color: #57cbde;
                                border-color: rgba(87, 203, 222, 0.3);
                                background: rgba(87, 203, 222, 0.08);
                            }

                            .ripper-steam-status-badge.offline {
                                color: #898989;
                                border-color: rgba(137, 137, 137, 0.2);
                                background: rgba(137, 137, 137, 0.05);
                            }

                            .ripper-steam-status-badge.in-game {
                                color: #90ba3c;
                                border-color: rgba(144, 186, 60, 0.3);
                                background: rgba(144, 186, 60, 0.08);
                            }

                            .ripper-steam-status-sep {
                                opacity: 0.5;
                                font-weight: 400;
                                margin: 0 2px;
                            }

                            .ripper-steam-profile-footer {
                                display: flex;
                                align-items: center;
                                justify-content: space-between;
                                gap: 12px;
                                padding: 16px 28px 20px;
                                border-top: 1px solid ${THEME.border};
                                background: ${THEME.bg};
                                flex-wrap: wrap;
                            }

                            .ripper-steam-profile-footer-text {
                                font-size: 0.82rem;
                                color: ${THEME.textMuted};
                                font-style: italic;
                                letter-spacing: 0.3px;
                                display: flex;
                                align-items: center;
                                gap: 8px;
                            }

                            .ripper-steam-profile-footer-text svg {
                                width: 14px;
                                height: 14px;
                                fill: currentColor;
                                opacity: 0.7;
                            }

                            .ripper-steam-link {
                                display: inline-flex;
                                align-items: center;
                                gap: 8px;
                                font-family: ${FONT_TITLE};
                                font-weight: 700;
                                font-size: 0.78rem;
                                letter-spacing: 1px;
                                text-transform: uppercase;
                                color: white;
                                text-decoration: none;
                                padding: 10px 20px;
                                border-radius: 10px;
                                background: ${THEME.accent};
                                box-shadow: 0 4px 14px rgba(193,31,43,0.3);
                                transition: background 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
                                border: none;
                                cursor: pointer;
                            }

                            .ripper-steam-link:hover {
                                background: ${THEME.accentHover};
                                transform: translateY(-1px);
                                box-shadow: 0 6px 20px rgba(193,31,43,0.45);
                                color: white;
                                text-decoration: none;
                            }

                            .ripper-steam-link svg {
                                width: 14px;
                                height: 14px;
                                fill: currentColor;
                            }

                            @media (max-width: 640px) {
                                .ripper-steam-profile-header {
                                    padding: 16px 16px 14px;
                                    gap: 12px;
                                }
                                .ripper-steam-avatar-wrap {
                                    width: 56px;
                                    height: 56px;
                                    border-width: 2px;
                                }
                                .ripper-steam-name {
                                    font-size: 1.05rem;
                                }
                                .ripper-steam-status-badge {
                                    font-size: 0.68rem;
                                    padding: 4px 10px;
                                }
                                .ripper-steam-profile-footer {
                                    padding: 12px 16px 16px;
                                    flex-direction: column;
                                    align-items: stretch;
                                }
                                .ripper-steam-link {
                                    justify-content: center;
                                    width: 100%;
                                }
                                .ripper-steam-profile-footer-text {
                                    justify-content: center;
                                }
                            }
                        `;
                        (document.head || document.documentElement).appendChild(style);
                    }

                    function getStatusInfo(statusText, inGameText, lastOnlineText) {
                        const status = (statusText || '').toLowerCase().trim();
                        const game = (inGameText || '').trim();
                        const last = (lastOnlineText || '').trim();

                        if (status.includes('не в сети') || status.includes('offline')) {
                            return { text: 'Не в сети', extra: last, class: 'offline' };
                        }

                        if (status.includes('в сети') || status.includes('online')) {
                            if (game !== '') {
                                return { text: game, extra: '', class: 'in-game' };
                            }
                            return { text: 'В сети', extra: '', class: 'online' };
                        }

                        if (game !== '') {
                            return { text: game, extra: '', class: 'in-game' };
                        }

                        return { text: 'Не в сети', extra: last, class: 'offline' };
                    }

                    function buildProfileBlock(data) {
                        const block = document.createElement('div');
                        block.className = 'ripper-steam-profile';

                        const status = getStatusInfo(data.statusText, data.inGameText, data.lastOnlineText);

                        const badgeContent = status.extra
                            ? `<span>${status.text}</span><span class="ripper-steam-status-sep">•</span><span>${status.extra}</span>`
                            : `<span>${status.text}</span>`;

                        block.innerHTML = `
                            <div class="ripper-steam-profile-header">
                                <div class="ripper-steam-avatar-wrap">
                                    <img class="ripper-steam-avatar" src="${AVATAR_URL}" alt="RIPPER" onerror="this.style.display='none'">
                                </div>
                                <div class="ripper-steam-info">
                                    <div class="ripper-steam-name">
                                        <a href="${PROFILE_URL}" target="_blank" rel="noopener noreferrer">${data.personaName || 'RIPPER'}</a>
                                    </div>
                                    <div class="ripper-steam-status-row">
                                        <div class="ripper-steam-status-badge ${status.class}">
                                            <span class="ripper-steam-status-dot"></span>
                                            ${badgeContent}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="ripper-steam-profile-footer">
                                <div class="ripper-steam-profile-footer-text">
                                    <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
                                    Steam профиль
                                </div>
                                <a class="ripper-steam-link" href="${PROFILE_URL}" target="_blank" rel="noopener noreferrer">
                                    <svg viewBox="0 0 24 24"><path d="M14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7zM19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7z"/></svg>
                                    Открыть профиль
                                </a>
                            </div>
                        `;

                        return block;
                    }

                    function parseSteamProfile(html) {
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(html, 'text/html');

                        let personaName = '';
                        const nameEl = doc.querySelector('.actual_persona_name, .profile_header .actual_persona_name');
                        if (nameEl) personaName = nameEl.textContent.trim();

                        let statusText = '';
                        let inGameText = '';
                        let lastOnlineText = '';

                        const statusInfoEl = doc.querySelector('.responsive_status_info');
                        if (statusInfoEl) {
                            const headerEl = statusInfoEl.querySelector('.profile_in_game_header');
                            if (headerEl) statusText = headerEl.textContent.trim();

                            const gameBlock = statusInfoEl.querySelector('.profile_in_game');
                            if (gameBlock) {
                                const isOffline = gameBlock.classList.contains('offline');
                                const nameEl = gameBlock.querySelector('.profile_in_game_name');
                                if (nameEl) {
                                    const txt = nameEl.textContent.trim();
                                    if (isOffline) {
                                        lastOnlineText = txt.replace(/^В сети:\s*/i, '').replace(/^Last Online:\s*/i, '');
                                    } else {
                                        inGameText = txt;
                                    }
                                }
                            }
                        }

                        if (!statusText) {
                            const onlineEl = doc.querySelector('.responsive_status_info .persona.online');
                            if (onlineEl) statusText = 'В сети';
                        }

                        if (!personaName) {
                            const titleMatch = doc.title.match(/Steam.*?::\s*(.+)/);
                            if (titleMatch) personaName = titleMatch[1].trim();
                        }

                        return { avatar: '', personaName, statusText, inGameText, lastOnlineText };
                    }

                    let state = 'idle';

                    function tryReplace() {
                        if (state !== 'idle') return;

                        const widget = document.querySelector('.steam-widget-section');
                        if (!widget) return;

                        if (widget.querySelector('.ripper-steam-profile')) {
                            state = 'done';
                            markReady();
                            return;
                        }

                        state = 'loading';

                        GM_xmlhttpRequest({
                            method: 'GET',
                            url: PROFILE_URL,
                            onload: function(response) {
                                try {
                                    const data = parseSteamProfile(response.responseText);
                                    const block = buildProfileBlock(data);
                                    const w = document.querySelector('.steam-widget-section');
                                    if (w) {
                                        w.innerHTML = '';
                                        w.appendChild(block);
                                        state = 'done';
                                    } else {
                                        state = 'idle';
                                    }
                                } catch (e) {
                                    console.warn('RIPMORE Steam Profile:', e);
                                    state = 'idle';
                                }
                                markReady();
                            },
                            onerror: function() {
                                state = 'idle';
                                markReady();
                            }
                        });
                    }

                    function init() {
                        injectEarlyHide();
                        injectStyles();

                        if (document.readyState === 'loading') {
                            document.addEventListener('DOMContentLoaded', tryReplace);
                        } else {
                            tryReplace();
                        }

                        const observer = new MutationObserver(function() {
                            if (state === 'done') {
                                const widget = document.querySelector('.steam-widget-section');
                                if (widget && !widget.querySelector('.ripper-steam-profile')) {
                                    state = 'idle';
                                } else {
                                    return;
                                }
                            }
                            tryReplace();
                        });

                        const startObserving = function() {
                            observer.observe(document.body, { childList: true, subtree: true });
                        };

                        if (document.body) {
                            startObserving();
                        } else {
                            document.addEventListener('DOMContentLoaded', startObserving, { once: true });
                        }
                    }

                    init();
                })();
            }

            if (IS_RIPMORE_PAGE) {
                (function initRipmorePage() {
                    const PAGE_THEME = {
                        bg: '#09090f',
                        card: '#101015',
                        accent: '#c11f2b',
                        accentHover: '#d4232f',
                        text: '#e0e0ff',
                        textMuted: '#a0a0cc',
                        border: '#1e1e28',
                        ok: '#3fb950',
                        fail: '#e5534b'
                    };

                    function renderPage() {
                        const statusCard = document.getElementById('statusCard');
                        const installCard = document.getElementById('installCard');
                        if (!statusCard && !installCard) return;

                        if (statusCard && !document.getElementById('ripmoreStatusContent')) {
                            statusCard.innerHTML = `
                                <h3>Статус расширения</h3>
                                <div id="ripmoreStatusContent"></div>
                            `;
                        }

                        if (installCard && !document.getElementById('ripmoreSettingsContent')) {
                            installCard.innerHTML = `
                                <h3>Настройки RIPMORE</h3>
                                <div id="ripmoreSettingsContent"></div>
                            `;
                        }

                        const statusContent = document.getElementById('ripmoreStatusContent');
                        if (statusContent) {
                            const s = getSettings();
                            const globalOk = s.global;
                            statusContent.innerHTML = `
                                <div class="status-badge ${globalOk ? 'ok' : 'fail'}">
                                    <span class="dot"></span>
                                    <span>${globalOk ? 'Расширение активно' : 'Расширение отключено'}</span>
                                </div>
                                <p style="color:var(--text-muted);font-size:0.95rem;margin-top:0.6rem;">
                                    ${globalOk
                                        ? 'Скрипт работает. Ниже можно включить или отключить отдельные функции.'
                                        : 'Все функции отключены. Включите общий переключатель, чтобы активировать скрипт.'}
                                </p>
                            `;
                        }

                        const settingsContent = document.getElementById('ripmoreSettingsContent');
                        if (settingsContent) {
                            const s = getSettings();
                            const siteInfoOn = s.global && s.site_info !== false;
                            const globalOn = s.global;

                            const rows = [
                                {
                                    key: 'global',
                                    label: 'Общий переключатель',
                                    desc: 'Включает или выключает все функции RIPMORE',
                                    disabled: false,
                                    dimmed: false
                                },
                                {
                                    key: 'custom_player',
                                    label: 'Кастомный плеер',
                                    desc: 'Изменяет интерфейс видеоплеера на сайте',
                                    disabled: !globalOn,
                                    dimmed: !globalOn
                                },
                                {
                                    key: 'site_info',
                                    label: 'Информация на страницах',
                                    desc: 'Общий переключатель для блоков отзывов на Steam и Shikimori',
                                    disabled: !globalOn,
                                    dimmed: !globalOn
                                },
                                {
                                    key: 'steam_review',
                                    label: 'Отзыв на Steam',
                                    desc: 'Добавляет блок с отзывом и оценкой на странице игры в Steam',
                                    disabled: !siteInfoOn,
                                    dimmed: !siteInfoOn,
                                    dependsOn: 'Информация на страницах'
                                },
                                {
                                    key: 'shikimori_review',
                                    label: 'Отзыв на Shikimori',
                                    desc: 'Добавляет блок с отзывом и оценкой на странице аниме',
                                    disabled: !siteInfoOn,
                                    dimmed: !siteInfoOn,
                                    dependsOn: 'Информация на страницах'
                                },
                                {
                                    key: 'steam_widget',
                                    label: 'Кастомный виджет Steam',
                                    desc: 'Заменяет стандартный виджет на сайте на странице с играми',
                                    disabled: !globalOn,
                                    dimmed: !globalOn
                                },
                                {
                                    key: 'mirror_data',
                                    label: 'Загружать данные с зеркала',
                                    desc: 'Использовать зеркало rippertw.github.io для загрузки баз игр и аниме',
                                    disabled: !globalOn,
                                    dimmed: !globalOn
                                }
                            ];

                            let html = '<div style="display:flex;flex-direction:column;gap:0.8rem;">';

                            rows.forEach(row => {
                                const checked = s[row.key] !== false;
                                const disabledAttr = row.disabled ? ' disabled' : '';
                                const dimmedStyle = row.dimmed ? 'opacity:0.45;' : '';
                                const dependNote = row.dependsOn
                                    ? `<div style="font-size:0.78rem;color:#e5534b;margin-top:0.3rem;">Зависит от «${row.dependsOn}»</div>`
                                    : '';
                                html += `
                                    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;padding:1rem 1.2rem;background:var(--bg);border:1px solid var(--border);border-radius:12px;${dimmedStyle}">
                                        <div style="flex:1;min-width:0;">
                                            <div style="font-weight:600;color:var(--text);margin-bottom:0.2rem;">${row.label}</div>
                                            <div style="font-size:0.85rem;color:var(--text-muted);line-height:1.4;">${row.desc}</div>
                                            ${dependNote}
                                        </div>
                                        <label style="position:relative;display:inline-block;width:46px;height:26px;flex-shrink:0;cursor:${row.disabled ? 'not-allowed' : 'pointer'};margin-top:0.2rem;">
                                            <input type="checkbox" data-setting="${row.key}" ${checked ? 'checked' : ''}${disabledAttr}
                                                style="opacity:0;width:0;height:0;position:absolute;">
                                            <span style="position:absolute;top:0;left:0;right:0;bottom:0;background:${checked && !row.disabled ? PAGE_THEME.accent : '#2a2a38'};border-radius:26px;transition:0.25s;display:block;"></span>
                                            <span style="position:absolute;top:3px;left:${checked ? '23px' : '3px'};width:20px;height:20px;background:#fff;border-radius:50%;transition:0.25s;display:block;box-shadow:0 2px 4px rgba(0,0,0,0.3);${row.disabled ? 'opacity:0.6;' : ''}"></span>
                                        </label>
                                    </div>
                                `;
                            });

                            html += '</div>';

                            html += `
                                <div style="margin-top:1.4rem;padding-top:1.2rem;border-top:1px solid var(--border);">
                                    <p style="font-size:0.85rem;color:var(--text-muted);margin-bottom:0.8rem;">
                                        После изменения настроек обновите страницу, чтобы применить их.
                                    </p>
                                    <div class="buttons" style="margin-top:0;">
                                        <a href="Files/Other/ripmore.user.js" class="btn" target="_blank" rel="noopener" style="background:var(--accent);">Установить RIPMORE</a>
                                        <a href="https://www.tampermonkey.net/" class="btn btn-outline" target="_blank" rel="noopener">Скачать Tampermonkey</a>
                                    </div>
                                    <p style="font-size:0.85rem;color:var(--text-muted);margin-top:1rem;">
                                        Если Tampermonkey уже установлен — просто нажми «Установить RIPMORE», откроется окно установки.
                                    </p>
                                </div>
                            `;

                            settingsContent.innerHTML = html;

                            settingsContent.querySelectorAll('input[data-setting]').forEach(input => {
                                input.addEventListener('change', function() {
                                    const key = this.getAttribute('data-setting');
                                    const s = getSettings();
                                    s[key] = this.checked;
                                    saveSettings(s);
                                    renderPage();
                                });
                            });
                        }
                    }

                    function injectToggleStyles() {
                        if (document.getElementById('ripmore-toggle-styles')) return;
                        const style = document.createElement('style');
                        style.id = 'ripmore-toggle-styles';
                        style.textContent = `
                            #ripmoreSettingsContent label input[type="checkbox"]:checked + span:first-of-type {
                                background: ${PAGE_THEME.accent} !important;
                            }
                            #ripmoreSettingsContent label input[type="checkbox"] + span:first-of-type {
                                background: #2a2a38;
                            }
                            #ripmoreSettingsContent label input[type="checkbox"]:disabled + span:first-of-type {
                                background: #2a2a38 !important;
                            }
                        `;
                        (document.head || document.documentElement).appendChild(style);
                    }

                    function start() {
                        injectToggleStyles();
                        renderPage();

                        const observer = new MutationObserver(function(mutations) {
                            let shouldRender = false;
                            for (const m of mutations) {
                                if (m.target.id === 'statusCard' || m.target.id === 'installCard') {
                                    shouldRender = true;
                                    break;
                                }
                            }
                            if (shouldRender) {
                                renderPage();
                            }
                        });

                        const statusCard = document.getElementById('statusCard');
                        const installCard = document.getElementById('installCard');
                        if (statusCard) observer.observe(statusCard, { childList: true, subtree: true });
                        if (installCard) observer.observe(installCard, { childList: true, subtree: true });
                    }

                    if (document.readyState === 'loading') {
                        document.addEventListener('DOMContentLoaded', start);
                    } else {
                        start();
                    }
                })();
            }
        })();
    }
})();