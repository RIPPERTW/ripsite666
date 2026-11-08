// ==UserScript==
// @name         RIPMORE
// @namespace    https://ripsite666.netlify.app/
// @version      2.0
// @description  RIPMORE - скрипт который служит улучшением для пользователей RIPSITE
// @author       RIPPER
// @match        https://dzen.ru/*
// @match        https://store.steampowered.com/app/*
// @match        https://shikimori.io/*
// @match        https://shikimori.one/*
// @match        https://ripsite666.netlify.app/*
// @match        https://rippertw.github.io/*
// @match        https://www.twitch.tv/*
// @match        https://www.kinopoisk.ru/film/*
// @match        https://www.kinopoisk.ru/series/*
// @match        https://anivox.fun/*
// @match        *://*/*
// @icon         https://ripsite666.netlify.app/Files/RIPMORE/RIPMORE.png
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_info
// @connect      ripsite666.netlify.app
// @connect      rippertw.github.io
// @connect      steamcommunity.com
// @connect      kinopoisk.ru
// @connect      anivox.fun
// @connect      sugi.moe
// @downloadURL  https://ripsite666.netlify.app/Files/RIPMORE/ripmore.user.js
// @updateURL    https://ripsite666.netlify.app/Files/RIPMORE/ripmore.user.js
// @run-at       document-start
// @connect      dbimg.app
// @connect      cdn.dbimg.app
// @connect      t.me
// @connect fonts.googleapis.com
// @connect fonts.gstatic.com
// ==/UserScript==

(function () {
    'use strict';

    const PRIMARY_BASE = 'https://ripsite666.netlify.app';
    const MIRROR_BASE = 'https://rippertw.github.io/ripsite666';

    const PRIMARY_FILES_BASE = PRIMARY_BASE;
    const MIRROR_FILES_BASE = MIRROR_BASE;

    const STEAM_PROFILE_URL = 'https://steamcommunity.com/id/ripper_cmertanoc/';

    const CUSTOM_DB_PATH = '/BD/custom_database.json';

    const SETTINGS_KEY = 'ripmore_settings';

    const DEFAULT_SETTINGS = {
        tg_feed: true,
        global: true,
        custom_player: true,
        site_info: true,
        steam_review: true,
        shikimori_review: true,
        steam_widget: true,
        twitch_enabled: true,
        mirror_data: false,
        mirror_pages: false,
        kinopoisk_review: true,
        anivox_review: true,
        show_rank_badges: true,
        show_smiles: true,
        twitch_leaderboard: true,
        universal_widget: false,
        twitch_image_codes: true,
        twitch_audio_codes: true
    };

    const IS_DZEN = /dzen\.ru/.test(location.hostname);
    const IS_STEAM = /store\.steampowered\.com/.test(location.hostname);
    const IS_SHIKIMORI = /shikimori\.(io|one)/.test(location.hostname);
    const IS_RIPSITE = /ripsite666\.netlify\.app|rippertw\.github\.io/.test(location.hostname);
    const IS_TWITCH = /twitch\.tv$/.test(location.hostname);
    const IS_KINOPOISK = /kinopoisk\.ru$/.test(location.hostname);
    const IS_ANIVOX = /anivox\.fun$/.test(location.hostname);

    const DB_TIMEOUT_MS = 10000;

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
        try { GM_setValue(SETTINGS_KEY, JSON.stringify(settings)); } catch (e) { }
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

    function isSiteInfoEnabled() { return isEnabled('site_info'); }
    function isRankBadgesEnabled() { return isEnabled('show_rank_badges'); }
    function isSmilesEnabled() { return isEnabled('show_smiles'); }
    function isMirrorOn() { return getSettings().mirror_data === true; }

    function getBaseUrl() { return isMirrorOn() ? MIRROR_BASE : PRIMARY_BASE; }
    function getFilesBaseUrl() { return isMirrorOn() ? MIRROR_FILES_BASE : PRIMARY_FILES_BASE; }

    function getPageUrl(path) {
        return (getSettings().mirror_pages ? MIRROR_BASE : PRIMARY_BASE) + path;
    }

    function getMedalsBaseUrl() { return getFilesBaseUrl() + '/Files/images/Badge/'; }
    function getSmileBaseUrl() { return getFilesBaseUrl() + '/Files/images/Smile/'; }
    function getRipmoreIconUrl() { return getFilesBaseUrl() + '/Files/RIPMORE/RIPMORE.png'; }
    function getSteamAvatarUrl() { return getFilesBaseUrl() + '/Files/images/other/RIPPERSQUARE.png'; }

    function gmFetchJson(url, timeoutMs) {
        return new Promise((resolve, reject) => {
            let finished = false;
            let timer = null;
            let req = null;
            const finish = (fn, val) => {
                if (finished) return;
                finished = true;
                if (timer) { clearTimeout(timer); timer = null; }
                fn(val);
            };
            try {
                req = GM_xmlhttpRequest({
                    method: 'GET',
                    url: url,
                    timeout: timeoutMs,
                    headers: {
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                        'Pragma': 'no-cache',
                        'Expires': '0'
                    },
                    onload: (r) => {
                        if (finished) return;
                        if ((r.status >= 200 && r.status < 300) || (r.status === 0 && r.responseText)) {
                            try { finish(resolve, JSON.parse(r.responseText)); }
                            catch (e) { finish(reject, new Error('JSON parse error')); }
                        } else {
                            finish(reject, new Error('HTTP ' + r.status));
                        }
                    },
                    onerror: () => finish(reject, new Error('Network error')),
                    ontimeout: () => finish(reject, new Error('Timeout')),
                    onabort: () => finish(reject, new Error('Aborted'))
                });
            } catch (e) { finish(reject, e); return; }
            if (timeoutMs && timeoutMs > 0) {
                timer = setTimeout(() => {
                    try { if (req && req.abort) req.abort(); } catch (e) { }
                    finish(reject, new Error('Timeout'));
                }, timeoutMs + 200);
            }
        });
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text == null ? '' : String(text);
        return div.innerHTML;
    }

    function normalizeTitle(title) {
        return String(title || '')
            .toLowerCase()
            .replace(/[™®©]/g, '')
            .replace(/[:\-–—]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function scoreMatch(title, dbTitle) {
        const a = normalizeTitle(title);
        const b = normalizeTitle(dbTitle);
        if (!a || !b) return 0;
        if (a === b) return 100;
        const aw = a.split(' ').filter(w => w.length > 1);
        const bw = b.split(' ').filter(w => w.length > 1);
        if (!aw.length || !bw.length) return 0;
        let score = 0;
        for (const w1 of aw) {
            for (const w2 of bw) {
                if (w1 === w2) score += 2;
                else if (w1.length > 3 && w2.length > 3 && (w1.startsWith(w2) || w2.startsWith(w1))) score += 1.2;
                else if (w1.length > 3 && w2.length > 3 && (w1.includes(w2) || w2.includes(w1))) score += 0.8;
            }
        }
        return (score / Math.max(aw.length, bw.length)) * 100;
    }

    function filterByQuery(query, db) {
        const q = normalizeTitle(query);
        if (!q) return [];
        const words = q.split(' ').filter(w => w.length > 0);
        const scored = [];
        for (const item of db) {
            const normDb = normalizeTitle(item.title);
            let score = 0;
            let allMatch = true;
            for (const w of words) {
                if (normDb.includes(w)) score += 2;
                else if (w.length > 2) {
                    const dw = normDb.split(' ');
                    let partial = false;
                    for (const d of dw) {
                        if (d.startsWith(w) || w.startsWith(d)) { partial = true; break; }
                    }
                    if (partial) score += 1; else allMatch = false;
                }
            }
            if ((allMatch || words.length === 1) && score > 0) scored.push({ item, score });
        }
        scored.sort((a, b) => b.score - a.score);
        return scored.slice(0, 20).map(s => s.item);
    }

    function findSuggestions(title, db, threshold = 30, limit = 10) {
        const scored = [];
        for (const item of db) {
            const s = scoreMatch(title, item.title);
            if (s >= threshold) scored.push({ item, score: s });
        }
        scored.sort((a, b) => b.score - a.score);
        return scored.slice(0, limit).map(s => s.item);
    }

    let CUSTOM_DB = null;
    let CUSTOM_DB_PROMISE = null;
    let CUSTOM_DB_FAILED = false;

    function loadCustomDatabase() {
        if (CUSTOM_DB) return Promise.resolve(CUSTOM_DB);
        if (CUSTOM_DB_PROMISE) return CUSTOM_DB_PROMISE;
        CUSTOM_DB_PROMISE = gmFetchJson(getBaseUrl() + CUSTOM_DB_PATH, DB_TIMEOUT_MS)
            .catch(() => gmFetchJson(MIRROR_BASE + CUSTOM_DB_PATH, DB_TIMEOUT_MS))
            .then(data => {
                CUSTOM_DB = data;
                CUSTOM_DB_PROMISE = null;
                return data;
            })
            .catch(e => {
                CUSTOM_DB_PROMISE = null;
                CUSTOM_DB_FAILED = true;
                throw e;
            });
        return CUSTOM_DB_PROMISE;
    }

    function getCustomSmileMap() {
        if (CUSTOM_DB && CUSTOM_DB.SMILE_MAP && typeof CUSTOM_DB.SMILE_MAP === 'object') {
            return CUSTOM_DB.SMILE_MAP;
        }
        return null;
    }

    function getCustomMedalsMap() {
        if (CUSTOM_DB && CUSTOM_DB.MEDALS_MAP && typeof CUSTOM_DB.MEDALS_MAP === 'object') {
            return CUSTOM_DB.MEDALS_MAP;
        }
        return null;
    }

    function buildOfferViewer(kind) {
        const id = 'ripper-mirror-offer-' + kind;
        const existing = document.getElementById(id);
        if (existing) return existing;

        const THEME = {
            bg: '#09090f', card: '#101015', accent: '#c11f2b', accentHover: '#d4232f',
            text: '#e0e0ff', textMuted: '#a0a0cc', border: '#1e1e28'
        };
        const FONT = "'Inter', system-ui, -apple-system, sans-serif";
        const FONT_TITLE = "'Orbitron', 'Inter', sans-serif";

        if (!document.getElementById('ripper-mirror-offer-styles')) {
            const style = document.createElement('style');
            style.id = 'ripper-mirror-offer-styles';
            style.textContent = `
                .ripper-mirror-offer{font-family:${FONT};background:${THEME.card};border:1px solid ${THEME.border};border-radius:18px;padding:0;margin:24px 0;color:${THEME.text};box-shadow:0 12px 48px rgba(0,0,0,0.6);overflow:hidden;line-height:1.6;box-sizing:border-box;width:100%;max-width:100%;animation:rmoFadeIn .4s ease-out}
                .ripper-mirror-offer *{box-sizing:border-box}
                @keyframes rmoFadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
                .ripper-mirror-offer .rmo-header{display:flex;align-items:center;gap:14px;padding:20px 24px 16px;border-bottom:1px solid ${THEME.border};background:${THEME.bg}}
                .ripper-mirror-offer .rmo-name{font-family:${FONT_TITLE};font-weight:700;font-size:1.1rem;letter-spacing:.8px;color:#fff;text-shadow:0 1px 4px rgba(0,0,0,.6);line-height:1.2}
                .ripper-mirror-offer .rmo-status{display:inline-flex;align-items:center;font-family:${FONT_TITLE};font-weight:700;font-size:.72rem;letter-spacing:1px;text-transform:uppercase;color:${THEME.textMuted};line-height:1;margin-top:3px}
                .ripper-mirror-offer .rmo-body{padding:20px 24px 22px}
                .ripper-mirror-offer .rmo-text{font-size:.95rem;line-height:1.7;color:${THEME.text};word-break:break-word}
                .ripper-mirror-offer .rmo-text strong{color:#fff;font-weight:600}
                .ripper-mirror-offer .rmo-error{margin-top:10px;font-size:.85rem;color:#e5534b;word-break:break-word}
                .ripper-mirror-offer .rmo-footer{display:flex;align-items:center;justify-content:flex-end;gap:10px;padding:14px 24px 18px;border-top:1px solid ${THEME.border};background:${THEME.bg};flex-wrap:wrap}
                .ripper-mirror-offer .rmo-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;font-family:${FONT_TITLE};font-weight:700;font-size:.78rem;letter-spacing:1px;text-transform:uppercase;color:#fff;text-decoration:none;padding:10px 18px;border-radius:10px;background:${THEME.accent};box-shadow:0 4px 14px rgba(193,31,43,.3);transition:background .2s,transform .2s,box-shadow .2s;border:none;cursor:pointer}
                .ripper-mirror-offer .rmo-btn:hover{background:${THEME.accentHover};transform:translateY(-1px);box-shadow:0 6px 20px rgba(193,31,43,.45)}
                .ripper-mirror-offer .rmo-btn.rmo-outline{background:transparent;color:${THEME.textMuted};border:1px solid ${THEME.border};box-shadow:none}
                .ripper-mirror-offer .rmo-btn.rmo-outline:hover{color:#fff;border-color:${THEME.accent};background:rgba(193,31,43,.12);box-shadow:none}
                @media(max-width:640px){.ripper-mirror-offer .rmo-header{padding:16px 16px 14px}.ripper-mirror-offer .rmo-name{font-size:1rem}.ripper-mirror-offer .rmo-body{padding:16px 16px 18px}.ripper-mirror-offer .rmo-footer{padding:12px 16px 16px;flex-direction:column;align-items:stretch}.ripper-mirror-offer .rmo-btn{width:100%}}
            `;
            (document.head || document.documentElement).appendChild(style);
        }

        const block = document.createElement('div');
        block.id = id;
        block.className = 'ripper-mirror-offer';
        block.innerHTML = `
            <div class="rmo-header"><div><div class="rmo-name">RIPSITE</div><div class="rmo-status"><span>Данные не загрузились</span></div></div></div>
            <div class="rmo-body">
                <div class="rmo-text">Основной источник не ответил. Можно попробовать загрузить данные с <strong>зеркала</strong>.</div>
                <div class="rmo-error" id="${id}-error"></div>
            </div>
            <div class="rmo-footer">
                <button type="button" class="rmo-btn rmo-outline" data-action="retry">Повторить запрос</button>
                <button type="button" class="rmo-btn" data-action="mirror">Загрузить с зеркала</button>
            </div>
        `;

        block.querySelector('[data-action="retry"]').addEventListener('click', () => {
            if (typeof block._onRetry === 'function') block._onRetry();
        });
        block.querySelector('[data-action="mirror"]').addEventListener('click', () => {
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
        if (existing) existing.replaceWith(offer);
        else container.parentNode.insertBefore(offer, container.nextSibling);
        return offer;
    }

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
            const SPEED_WRAPPER_SELECTOR = 'div[class*="video-embed--video-controls__speed"]';
            const QUALITY_WRAPPER_SELECTOR = 'div[class*="video-embed--video-controls__quality"]';
            const SPEED_BUTTON_SELECTOR = 'button[aria-label="Скорость воспроизведения"]';
            const QUALITY_BUTTON_SELECTOR = 'button[aria-label="Качество видео"]';
            const RIGHT_GROUP_SELECTOR = 'div[class*="video-embed--video-controls__right"]';
            const COMPOSER_ITEM_SELECTOR = 'div[class*="video-embed--video-controls__composerItem"]';
            const POPUP_BASE_SELECTOR = '[data-testid="popup-base"]';
            const POPUP_CONTENT_SELECTOR = 'div[class*="video-embed--video-controls-popup__content"]';
            const POPUP_TITLE_SELECTOR = 'h4[class*="video-embed--video-controls-content__title"]';
            const POPUP_GRID_SELECTOR = 'div[class*="video-embed--video-controls-grid__videoControlsGrid"]';
            const POPUP_GRID_ITEM_SELECTOR = 'div[class*="video-embed--video-controls-grid__title"]';
            const POPUP_GRID_ACTIVE_SELECTOR = 'div[class*="video-embed--video-controls-grid__isActive"]';
            const POPUP_LIST_SELECTOR = 'div[class*="video-embed--video-controls-list__videoControlsList"]';
            const POPUP_LIST_ITEM_SELECTOR = 'button[class*="video-embed--video-controls-list__listItem"]';
            const POPUP_LIST_TEXT_SELECTOR = 'span[class*="video-embed--video-controls-list__listItemText"]';
            const POPUP_LIST_ICON_WRAP_SELECTOR = 'span[class*="video-embed--video-controls-list__listItemIconContainer"]';
            const POPUP_LIST_ICON_SELECTOR = 'svg[class*="video-embed--video-controls-list__activeIcon"]';
            const VIDEO_STATE_SELECTOR = '[class*="video-embed--video-state__videoState"]';
            const STATE_CHANGE_INDICATOR_SELECTOR = '[class*="video-embed--video-state-change-indicator__stateChangeIndicator"]';
            const TIMELINE_PREVIEW_IMAGE_SELECTOR = '[class*="video-embed--video-timeline-preview__image"]';
            const TIMELINE_PREVIEW_LABEL_TIME_SELECTOR = '[class*="video-embed--video-timeline-preview__labelTime"]';
            const SUBTITLES_SELECTOR = '[class*="video-embed--styles__videoSubtitles"]';

            const SETTINGS_BTN_ID = 'vk-video-settings-btn';
            const SETTINGS_MENU_ID = 'vk-video-settings-menu';
            const SETTINGS_WRAP_ID = 'vk-video-settings-wrap';
            const PIP_BTN_ID = 'vk-video-pip-btn';

            const THEME = {
                bg: '#09090f', card: '#101015', accent: '#c11f2b', accentHover: '#d4232f',
                text: '#e0e0ff', textMuted: '#a0a0cc', border: '#1e1e28', borderHover: '#2a2a38'
            };
            const ICON_COLOR = THEME.textMuted;
            const ICON_HOVER_COLOR = '#4a4a66';
            const TITLE_TEXT_SHADOW = '0 0 3px #000, 0 0 3px #000, 0 0 2px #000, 0 1px 2px #000';
            const IDLE_HIDE_DELAY = 3000;

            let hasPlayed = false;
            let settingsIdleTimer = null;

            function injectGlobalStyles() {
                if (document.getElementById('vk-video-theme-styles')) return;
                const style = document.createElement('style');
                style.id = 'vk-video-theme-styles';
                style.textContent = `
                    .video-embed--video-timeline__cursor-1_:after,[class*="video-embed--video-timeline__cursor"]:after{background-color:${THEME.accent}!important;border-color:${THEME.accent}!important;box-shadow:0 0 6px rgba(193,31,43,.7)!important}
                    .video-embed--video-timeline__episodeProgress-2t,[class*="video-embed--video-timeline__episodeProgress"]{background:${THEME.accent}!important}
                    .video-embed--video-timeline__timelineEpisode-12,[class*="video-embed--video-timeline__timelineEpisode"]{background:${THEME.border}!important}
                    [class*="video-embed--video-timeline__timelineEpisode"]:hover{background:#2a2a38!important}
                    .video-embed--animated-play-button__play-3b:after,.video-embed--animated-play-button__play-3b:before{content:"";display:block;top:0;right:0;bottom:0;left:0;position:absolute;background:${THEME.accent}!important;z-index:-1;border-radius:50%;transition:all .45s cubic-bezier(0,0,.4,1.3)}
                    ${AUTHOR_SELECTORS.join(',')}{display:none!important}
                    ${TITLE_SELECTORS.join(',')}{color:${ICON_COLOR}!important;pointer-events:none!important;cursor:default!important;text-decoration:none!important;text-shadow:${TITLE_TEXT_SHADOW}!important}
                    ${TIME_CONTAINER_SELECTOR}{color:${ICON_COLOR}!important;font-family:'Inter',system-ui,sans-serif!important;font-weight:600!important;transition:color .25s ease!important}
                    ${TIME_CURRENT_SELECTOR}{color:${ICON_COLOR}!important;font-weight:600!important}
                    ${TIME_DURATION_SELECTOR}{color:${ICON_COLOR}!important;font-weight:500!important}
                    ${TIME_DURATION_WRAP_SELECTOR},${TIME_DURATION_WRAP_SELECTOR} span{color:${ICON_COLOR}!important}
                    ${TIME_SLICE_SELECTOR}{color:${ICON_COLOR}!important;opacity:.7!important}
                    ${PLAY_BUTTON_SELECTOR},${PLAY_BUTTON_SELECTOR} *,${PLAY_BUTTON_SVG_SELECTOR},${PLAY_BUTTON_SVG_SELECTOR} *,${PLAY_BUTTON_USE_SELECTOR},${PLAY_BUTTON_USE_SELECTOR} *{color:${ICON_COLOR}!important;fill:${ICON_COLOR}!important}
                    ${FULLSCREEN_BUTTON_SELECTOR},${FULLSCREEN_BUTTON_SELECTOR} *,${FULLSCREEN_SVG_SELECTOR},${FULLSCREEN_SVG_SELECTOR} *,${FULLSCREEN_USE_SELECTOR},${FULLSCREEN_USE_SELECTOR} *{color:${ICON_COLOR}!important;fill:${ICON_COLOR}!important}
                    ${CLOSE_BUTTON_SELECTOR},${CLOSE_BUTTON_SELECTOR} *,${CLOSE_SVG_SELECTOR},${CLOSE_SVG_SELECTOR} *,${CLOSE_USE_SELECTOR},${CLOSE_USE_SELECTOR} *{color:${ICON_COLOR}!important;fill:${ICON_COLOR}!important}
                    ${SOUND_BUTTON_SELECTOR},${SOUND_BUTTON_SELECTOR} *,${SOUND_SVG_SELECTOR},${SOUND_SVG_SELECTOR} *{color:${ICON_COLOR}!important;fill:${ICON_COLOR}!important}
                    ${SLIDER_THUMB_SELECTOR}{background:${THEME.accent}!important;box-shadow:0 0 8px rgba(193,31,43,.6)!important}
                    ${SLIDER_PROGRESS_SELECTOR}{background:${THEME.accent}!important}
                    ${SLIDER_TRACK_SELECTOR}{background:${THEME.border}!important}
                    ${VIDEO_STATE_SELECTOR}{color:${THEME.textMuted}!important}
                    ${STATE_CHANGE_INDICATOR_SELECTOR}{background-color:transparent!important}
                    ${TIMELINE_PREVIEW_IMAGE_SELECTOR}{border-color:${THEME.textMuted}!important}
                    ${TIMELINE_PREVIEW_LABEL_TIME_SELECTOR}{color:${THEME.textMuted}!important}
                    ${SUBTITLES_SELECTOR}{letter-spacing:-.24px!important;position:absolute!important;padding:12px 16px!important;border-radius:16px!important;display:flex!important;align-items:start!important;flex-direction:column!important;color:#fff!important;background-color:transparent!important;transition:bottom .15s ease-out,opacity .1s ease-out!important;opacity:1!important;font-size:19px!important;text-shadow:0 0 4px rgba(0,0,0,.8),0 0 8px rgba(0,0,0,.6),1px 1px 2px rgba(0,0,0,.9)!important}
                    #${SETTINGS_BTN_ID},#${PIP_BTN_ID}{color:${ICON_COLOR}!important;fill:${ICON_COLOR}!important;background:transparent!important}
                    #${SETTINGS_BTN_ID} svg,#${SETTINGS_BTN_ID} svg *,#${PIP_BTN_ID} svg,#${PIP_BTN_ID} svg *{color:${ICON_COLOR}!important;fill:${ICON_COLOR}!important;transition:color .1s,fill .1s!important}
                    #${SETTINGS_BTN_ID}:hover,#${PIP_BTN_ID}:hover{background:transparent!important;border-radius:10px!important}
                    #${SETTINGS_BTN_ID}:hover svg,#${SETTINGS_BTN_ID}:hover svg *,#${PIP_BTN_ID}:hover svg,#${PIP_BTN_ID}:hover svg *{color:${ICON_HOVER_COLOR}!important;fill:${ICON_HOVER_COLOR}!important}
                    #${SETTINGS_MENU_ID} [data-action]:hover{background:rgba(193,31,43,.25)!important;color:#fff!important}
                    ${POPUP_BASE_SELECTOR}{background:${THEME.card}!important;border:1px solid ${THEME.border}!important;border-radius:16px!important;box-shadow:0 12px 40px rgba(0,0,0,.55)!important;overflow:hidden!important;backdrop-filter:blur(12px)!important}
                    ${POPUP_CONTENT_SELECTOR}{background:transparent!important;padding:4px!important}
                    ${POPUP_TITLE_SELECTOR}{color:${THEME.accent}!important;font-family:'Inter',system-ui,sans-serif!important;font-weight:700!important;font-size:13px!important;letter-spacing:.6px!important;padding:12px 16px 8px!important;margin:0!important;text-transform:uppercase!important;border-bottom:1px solid ${THEME.border}!important}
                    ${POPUP_GRID_SELECTOR}{display:grid!important;grid-template-columns:repeat(4,minmax(64px,1fr))!important;gap:6px!important;padding:10px!important;background:transparent!important}
                    ${POPUP_GRID_SELECTOR} ${POPUP_GRID_ITEM_SELECTOR}{background:${THEME.bg}!important;border:1px solid ${THEME.border}!important;border-radius:12px!important;color:${THEME.text}!important;font-family:'Inter',system-ui,sans-serif!important;font-weight:600!important;font-size:13px!important;text-align:center!important;padding:10px 6px!important;cursor:pointer!important;transition:background .25s,border-color .25s,color .25s,transform .25s,box-shadow .25s!important;user-select:none!important;display:flex!important;align-items:center!important;justify-content:center!important;min-height:40px!important;line-height:1!important;box-shadow:none!important}
                    ${POPUP_GRID_SELECTOR} ${POPUP_GRID_ITEM_SELECTOR}:hover{background:rgba(193,31,43,.18)!important;border-color:${THEME.accent}!important;color:#fff!important;transform:translateY(-2px)!important;box-shadow:0 6px 18px rgba(193,31,43,.2)!important}
                    ${POPUP_GRID_SELECTOR} ${POPUP_GRID_ACTIVE_SELECTOR}{background:${THEME.accent}!important;border-color:${THEME.accent}!important;color:#fff!important;box-shadow:0 0 0 1px ${THEME.accent},0 6px 18px rgba(193,31,43,.35)!important}
                    ${POPUP_GRID_SELECTOR} ${POPUP_GRID_ACTIVE_SELECTOR}:hover{background:${THEME.accentHover}!important;border-color:${THEME.accentHover}!important}
                    ${POPUP_LIST_SELECTOR}{display:flex!important;flex-direction:column!important;gap:4px!important;padding:8px!important;background:transparent!important;max-height:320px!important;overflow-y:auto!important}
                    ${POPUP_LIST_ITEM_SELECTOR}{background:${THEME.bg}!important;border:1px solid ${THEME.border}!important;border-radius:12px!important;color:${THEME.text}!important;font-family:'Inter',system-ui,sans-serif!important;font-weight:600!important;font-size:13px!important;padding:10px 14px!important;cursor:pointer!important;transition:background .25s,border-color .25s,color .25s,transform .25s,box-shadow .25s!important;user-select:none!important;display:flex!important;align-items:center!important;justify-content:space-between!important;width:100%!important;text-align:left!important;outline:none!important;box-shadow:none!important}
                    ${POPUP_LIST_ITEM_SELECTOR}:hover{background:rgba(193,31,43,.18)!important;border-color:${THEME.accent}!important;color:#fff!important;transform:translateY(-1px)!important;box-shadow:0 4px 14px rgba(193,31,43,.2)!important}
                    ${POPUP_LIST_ITEM_SELECTOR}[aria-current="true"]{background:${THEME.accent}!important;border-color:${THEME.accent}!important;color:#fff!important;box-shadow:0 0 0 1px ${THEME.accent},0 6px 18px rgba(193,31,43,.35)!important}
                    ${POPUP_LIST_ITEM_SELECTOR}[aria-current="true"]:hover{background:${THEME.accentHover}!important;border-color:${THEME.accentHover}!important}
                    ${POPUP_LIST_TEXT_SELECTOR}{color:inherit!important;font-family:inherit!important;font-weight:inherit!important;font-size:inherit!important}
                    ${POPUP_LIST_ICON_WRAP_SELECTOR}{display:inline-flex!important;align-items:center!important;justify-content:center!important;color:inherit!important}
                    ${POPUP_LIST_ICON_SELECTOR}{fill:currentColor!important;color:inherit!important;width:20px!important;height:20px!important;display:block!important}
                    ${POPUP_LIST_SELECTOR}::-webkit-scrollbar{width:6px}${POPUP_LIST_SELECTOR}::-webkit-scrollbar-thumb{background:${THEME.accent};border-radius:3px}${POPUP_LIST_SELECTOR}::-webkit-scrollbar-track{background:transparent}
                    ${POPUP_BASE_SELECTOR}::-webkit-scrollbar{width:6px}${POPUP_BASE_SELECTOR}::-webkit-scrollbar-thumb{background:${THEME.accent};border-radius:3px}
                    #${SETTINGS_MENU_ID}{position:absolute;background:${THEME.card}!important;border:1px solid ${THEME.border}!important;border-radius:16px!important;padding:6px!important;display:none;min-width:180px;z-index:2147483647;color:${THEME.text};font-family:'Inter',system-ui,sans-serif;font-size:14px;box-shadow:0 12px 40px rgba(0,0,0,.55)!important;user-select:none;overflow:hidden;backdrop-filter:blur(12px)}
                    #${SETTINGS_MENU_ID} [data-action]{padding:12px 16px;cursor:pointer;transition:background .25s,color .25s,transform .25s,box-shadow .25s;color:${THEME.text};font-weight:600;font-size:13px;display:flex;align-items:center;justify-content:center;border-radius:12px;border:1px solid transparent;background:${THEME.bg};margin-bottom:4px;text-align:center}
                    #${SETTINGS_MENU_ID} [data-action]:last-child{margin-bottom:0}
                    #${SETTINGS_MENU_ID} [data-action]:hover{background:rgba(193,31,43,.18)!important;border-color:${THEME.accent}!important;color:#fff!important;transform:translateY(-1px);box-shadow:0 4px 14px rgba(193,31,43,.2)}
                    .vk-video-hidden-by-script{opacity:0!important;visibility:hidden!important;pointer-events:none!important;transition:opacity .25s,visibility .25s!important}
                `;
                (document.head || document.documentElement).appendChild(style);
            }

            function getFullscreenElement() {
                return document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement || null;
            }

            function findRightGroup(root) {
                root = root || document;
                const right = root.querySelector(RIGHT_GROUP_SELECTOR);
                if (right) return right;
                const composers = root.querySelectorAll(COMPOSER_ITEM_SELECTOR);
                if (composers.length) return composers[composers.length - 1];
                const speed = root.querySelector(SPEED_WRAPPER_SELECTOR);
                const quality = root.querySelector(QUALITY_WRAPPER_SELECTOR);
                const anchor = speed || quality;
                return anchor && anchor.parentElement ? anchor.parentElement : null;
            }

            function getControlsHost() {
                const fs = getFullscreenElement();
                if (fs) return findRightGroup(fs) || fs;
                return findRightGroup(document);
            }

            function getMenuHost() { return getFullscreenElement() || document.body; }

            function setSettingsVisibility(visible) {
                const wrap = document.getElementById(SETTINGS_WRAP_ID);
                const btn = document.getElementById(SETTINGS_BTN_ID);
                const pip = document.getElementById(PIP_BTN_ID);
                const menu = document.getElementById(SETTINGS_MENU_ID);
                [wrap, btn, pip].forEach(el => {
                    if (!el) return;
                    if (visible) el.classList.remove('vk-video-hidden-by-script');
                    else el.classList.add('vk-video-hidden-by-script');
                });
                if (!visible && menu) menu.style.display = 'none';
            }

            function showSettingsTemporarily() {
                if (!hasPlayed) { setSettingsVisibility(false); return; }
                setSettingsVisibility(true);
                if (settingsIdleTimer) clearTimeout(settingsIdleTimer);
                settingsIdleTimer = setTimeout(() => setSettingsVisibility(false), IDLE_HIDE_DELAY);
            }

            function scheduleHideSettings() {
                if (settingsIdleTimer) clearTimeout(settingsIdleTimer);
                settingsIdleTimer = setTimeout(() => setSettingsVisibility(false), IDLE_HIDE_DELAY);
            }

            function removeUnwantedElements() {
                WATERMARK_SELECTORS.forEach(sel => document.querySelectorAll(sel).forEach(el => {
                    (el.closest('[data-testid="video-controls-watermark"]') || el.closest('div[class*="watermarkWrapper"]') || el).remove();
                }));
                RATING_SELECTORS.forEach(sel => document.querySelectorAll(sel).forEach(el => {
                    (el.closest('div[class*="video-embed--video-controls__rating"]') || el.closest('div[class*="video-controls-popup__videoControlsPopup"]') || el).remove();
                }));
            }

            function styleHeader() {
                AUTHOR_SELECTORS.forEach(sel => document.querySelectorAll(sel).forEach(el => el.style.display = 'none'));
                TITLE_SELECTORS.forEach(sel => document.querySelectorAll(sel).forEach(el => {
                    el.style.color = ICON_COLOR;
                    el.style.pointerEvents = 'none';
                    el.style.cursor = 'default';
                    el.style.textDecoration = 'none';
                    el.style.transition = 'opacity .25s,visibility .25s';
                    el.style.setProperty('text-shadow', TITLE_TEXT_SHADOW, 'important');
                    el.classList.toggle('vk-video-hidden-by-script', !hasPlayed);
                    if (!el.dataset.vkHeaderStyled) {
                        el.dataset.vkHeaderStyled = 'true';
                        el.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); }, true);
                    }
                }));
                document.querySelectorAll('div[class*="video-embed--video-controls__headerFull"],div[class*="video-embed--video-header-embed__container"],div[class*="video-embed--video-header-embed__header"],div[class*="video-embed--video-header-embed__wrapper"],div[class*="video-embed--video-header-embed__inner"]').forEach(el => {
                    el.style.transition = 'opacity .25s,visibility .25s';
                    el.classList.toggle('vk-video-hidden-by-script', !hasPlayed);
                });
            }

            function styleTime() {
                document.querySelectorAll(TIME_CONTAINER_SELECTOR).forEach(el => {
                    el.style.color = ICON_COLOR;
                    el.style.fontFamily = "'Inter',system-ui,sans-serif";
                    el.style.fontWeight = '600';
                    el.style.transition = 'color .25s';
                });
                document.querySelectorAll(TIME_CURRENT_SELECTOR).forEach(el => { el.style.color = ICON_COLOR; el.style.fontWeight = '600'; });
                document.querySelectorAll(TIME_DURATION_SELECTOR).forEach(el => { el.style.color = ICON_COLOR; el.style.fontWeight = '500'; });
                document.querySelectorAll(TIME_DURATION_WRAP_SELECTOR).forEach(el => {
                    el.style.color = ICON_COLOR;
                    el.querySelectorAll('span').forEach(s => s.style.color = ICON_COLOR);
                });
                document.querySelectorAll(TIME_SLICE_SELECTOR).forEach(el => { el.style.color = ICON_COLOR; el.style.opacity = '.7'; });
            }

            function styleIcons(selectors, svgSelectors, useSelectors) {
                selectors.forEach(sel => document.querySelectorAll(sel).forEach(btn => {
                    btn.style.color = ICON_COLOR;
                    btn.style.fill = ICON_COLOR;
                    btn.querySelectorAll('*').forEach(c => {
                        c.style.setProperty('color', ICON_COLOR, 'important');
                        c.style.setProperty('fill', ICON_COLOR, 'important');
                    });
                }));
                svgSelectors.forEach(sel => document.querySelectorAll(sel).forEach(svg => {
                    svg.style.color = ICON_COLOR;
                    svg.style.fill = ICON_COLOR;
                    svg.querySelectorAll('*').forEach(c => {
                        c.style.setProperty('color', ICON_COLOR, 'important');
                        c.style.setProperty('fill', ICON_COLOR, 'important');
                    });
                }));
                useSelectors.forEach(sel => document.querySelectorAll(sel).forEach(use => {
                    use.style.setProperty('color', ICON_COLOR, 'important');
                    use.style.setProperty('fill', ICON_COLOR, 'important');
                }));
            }

            function styleSoundAndSlider() {
                styleIcons([SOUND_BUTTON_SELECTOR], [SOUND_SVG_SELECTOR], []);
                document.querySelectorAll(SLIDER_THUMB_SELECTOR).forEach(el => {
                    el.style.background = THEME.accent;
                    el.style.boxShadow = '0 0 8px rgba(193,31,43,.6)';
                });
                document.querySelectorAll(SLIDER_PROGRESS_SELECTOR).forEach(el => el.style.background = THEME.accent);
                document.querySelectorAll(SLIDER_TRACK_SELECTOR).forEach(el => el.style.background = THEME.border);
            }

            function hideOriginalButtons() {
                [SPEED_WRAPPER_SELECTOR, QUALITY_WRAPPER_SELECTOR].forEach(sel => {
                    document.querySelectorAll(sel).forEach(el => {
                        el.style.visibility = 'hidden';
                        el.style.position = 'absolute';
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
                const host = getControlsHost();
                const menuHost = getMenuHost();
                if (!host) { removeSettingsUI(); return; }

                const existingWrap = document.getElementById(SETTINGS_WRAP_ID);
                const existingMenu = document.getElementById(SETTINGS_MENU_ID);
                if (existingWrap && existingWrap.parentElement === host && existingMenu && existingMenu.parentElement === menuHost) {
                    if (!hasPlayed) setSettingsVisibility(false);
                    return;
                }

                removeSettingsUI();

                const wrapper = document.createElement('div');
                wrapper.id = SETTINGS_WRAP_ID;
                wrapper.style.cssText = 'position:relative;display:inline-flex;align-items:center;transition:opacity .25s,visibility .25s';

                const pipBtn = document.createElement('button');
                pipBtn.id = PIP_BTN_ID;
                pipBtn.type = 'button';
                pipBtn.setAttribute('aria-label', 'Картинка в картинке');
                pipBtn.style.cssText = `background:transparent;border:none;cursor:pointer;padding:0;margin:0 4px;display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;color:${ICON_COLOR};fill:${ICON_COLOR};pointer-events:auto;border-radius:10px`;
                pipBtn.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="${ICON_COLOR}" style="color:${ICON_COLOR};fill:${ICON_COLOR};transition:color .1s,fill .1s"><path d="M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z"/></svg>`;
                pipBtn.addEventListener('click', (e) => {
                    e.stopPropagation(); e.preventDefault();
                    const v = document.querySelector('video');
                    if (!v) return;
                    if (document.pictureInPictureElement) document.exitPictureInPicture().catch(() => { });
                    else v.requestPictureInPicture().catch(() => { });
                    showSettingsTemporarily();
                });
                ['mousedown', 'mouseup', 'pointerdown'].forEach(ev => pipBtn.addEventListener(ev, (e) => e.stopPropagation(), true));
                wrapper.appendChild(pipBtn);

                const btn = document.createElement('button');
                btn.id = SETTINGS_BTN_ID;
                btn.type = 'button';
                btn.setAttribute('aria-label', 'Настройки');
                btn.style.cssText = `background:transparent;border:none;cursor:pointer;padding:0;margin:0 4px;display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;color:${ICON_COLOR};fill:${ICON_COLOR};pointer-events:auto;border-radius:10px`;
                btn.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" fill="${ICON_COLOR}" style="color:${ICON_COLOR};fill:${ICON_COLOR};transition:color .1s,fill .1s"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>`;
                wrapper.appendChild(btn);

                const menu = document.createElement('div');
                menu.id = SETTINGS_MENU_ID;
                menu.innerHTML = '<div data-action="speed">Скорость</div><div data-action="quality">Качество</div>';
                menu.addEventListener('click', (e) => {
                    e.stopPropagation(); e.preventDefault();
                    const item = e.target.closest('[data-action]');
                    if (!item) return;
                    const action = item.getAttribute('data-action');
                    menu.style.display = 'none';
                    const sel = action === 'speed' ? SPEED_BUTTON_SELECTOR : QUALITY_BUTTON_SELECTOR;
                    const wrapSel = action === 'speed' ? SPEED_WRAPPER_SELECTOR : QUALITY_WRAPPER_SELECTOR;
                    const orig = document.querySelector(sel);
                    if (!orig) return;
                    const w = orig.closest(wrapSel);
                    if (w) { w.style.visibility = 'visible'; w.style.position = ''; w.style.pointerEvents = ''; }
                    setTimeout(() => {
                        orig.click();
                        setTimeout(() => {
                            if (w) { w.style.visibility = 'hidden'; w.style.position = 'absolute'; w.style.pointerEvents = 'none'; }
                        }, 200);
                    }, 0);
                });

                function toggleMenu(e) {
                    e.stopPropagation(); e.preventDefault();
                    if (menu.style.display === 'block') { menu.style.display = 'none'; return; }
                    const rect = btn.getBoundingClientRect();
                    menu.style.display = 'block';
                    const menuRect = menu.getBoundingClientRect();
                    let top = rect.top - menuRect.height - 8;
                    let left = rect.left + rect.width / 2 - menuRect.width / 2;
                    if (top < 4) top = rect.bottom + 8;
                    if (left < 4) left = 4;
                    if (left + menuRect.width > window.innerWidth - 4) left = window.innerWidth - menuRect.width - 4;
                    menu.style.top = top + 'px';
                    menu.style.left = left + 'px';
                    showSettingsTemporarily();
                }

                btn.addEventListener('click', toggleMenu, true);
                ['mousedown', 'mouseup', 'pointerdown'].forEach(ev => btn.addEventListener(ev, (e) => e.stopPropagation(), true));

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

                if (!hasPlayed) setSettingsVisibility(false);
                else showSettingsTemporarily();
            }

            function stylePopups() {
                document.querySelectorAll(POPUP_BASE_SELECTOR).forEach(el => {
                    el.style.background = THEME.card;
                    el.style.border = `1px solid ${THEME.border}`;
                    el.style.borderRadius = '16px';
                    el.style.boxShadow = '0 12px 40px rgba(0,0,0,.55)';
                    el.style.overflow = 'hidden';
                    el.style.backdropFilter = 'blur(12px)';
                });
                document.querySelectorAll(POPUP_CONTENT_SELECTOR).forEach(el => { el.style.background = 'transparent'; el.style.padding = '4px'; });
                document.querySelectorAll(POPUP_TITLE_SELECTOR).forEach(el => {
                    el.style.color = THEME.accent;
                    el.style.fontFamily = "'Inter',system-ui,sans-serif";
                    el.style.fontWeight = '700';
                    el.style.fontSize = '13px';
                    el.style.letterSpacing = '.6px';
                    el.style.padding = '12px 16px 8px';
                    el.style.margin = '0';
                    el.style.textTransform = 'uppercase';
                    el.style.borderBottom = `1px solid ${THEME.border}`;
                });
                document.querySelectorAll(POPUP_GRID_SELECTOR).forEach(el => {
                    el.style.display = 'grid';
                    el.style.gridTemplateColumns = 'repeat(4,minmax(64px,1fr))';
                    el.style.gap = '6px';
                    el.style.padding = '10px';
                    el.style.background = 'transparent';
                });
                document.querySelectorAll(POPUP_GRID_SELECTOR + ' ' + POPUP_GRID_ITEM_SELECTOR).forEach(el => {
                    const isActive = el.matches(POPUP_GRID_SELECTOR + ' ' + POPUP_GRID_ACTIVE_SELECTOR);
                    el.style.background = isActive ? THEME.accent : THEME.bg;
                    el.style.border = `1px solid ${isActive ? THEME.accent : THEME.border}`;
                    el.style.borderRadius = '12px';
                    el.style.color = isActive ? '#fff' : THEME.text;
                    el.style.fontFamily = "'Inter',system-ui,sans-serif";
                    el.style.fontWeight = '600';
                    el.style.fontSize = '13px';
                    el.style.textAlign = 'center';
                    el.style.padding = '10px 6px';
                    el.style.cursor = 'pointer';
                    el.style.transition = 'background .25s,border-color .25s,color .25s,transform .25s,box-shadow .25s';
                    el.style.userSelect = 'none';
                    el.style.display = 'flex';
                    el.style.alignItems = 'center';
                    el.style.justifyContent = 'center';
                    el.style.minHeight = '40px';
                    el.style.lineHeight = '1';
                    el.style.boxShadow = isActive ? `0 0 0 1px ${THEME.accent},0 6px 18px rgba(193,31,43,.35)` : 'none';
                });
                document.querySelectorAll(POPUP_LIST_SELECTOR).forEach(el => {
                    el.style.display = 'flex';
                    el.style.flexDirection = 'column';
                    el.style.gap = '4px';
                    el.style.padding = '8px';
                    el.style.background = 'transparent';
                    el.style.maxHeight = '320px';
                    el.style.overflowY = 'auto';
                });
                document.querySelectorAll(POPUP_LIST_ITEM_SELECTOR).forEach(el => {
                    const isActive = el.getAttribute('aria-current') === 'true';
                    el.style.background = isActive ? THEME.accent : THEME.bg;
                    el.style.border = `1px solid ${isActive ? THEME.accent : THEME.border}`;
                    el.style.borderRadius = '12px';
                    el.style.color = isActive ? '#fff' : THEME.text;
                    el.style.fontFamily = "'Inter',system-ui,sans-serif";
                    el.style.fontWeight = '600';
                    el.style.fontSize = '13px';
                    el.style.padding = '10px 14px';
                    el.style.cursor = 'pointer';
                    el.style.transition = 'background .25s,border-color .25s,color .25s,transform .25s,box-shadow .25s';
                    el.style.userSelect = 'none';
                    el.style.display = 'flex';
                    el.style.alignItems = 'center';
                    el.style.justifyContent = 'space-between';
                    el.style.width = '100%';
                    el.style.textAlign = 'left';
                    el.style.outline = 'none';
                    el.style.boxShadow = isActive ? `0 0 0 1px ${THEME.accent},0 6px 18px rgba(193,31,43,.35)` : 'none';
                });
                document.querySelectorAll(POPUP_LIST_TEXT_SELECTOR).forEach(el => {
                    el.style.color = 'inherit';
                    el.style.fontFamily = 'inherit';
                    el.style.fontWeight = 'inherit';
                    el.style.fontSize = 'inherit';
                });
                document.querySelectorAll(POPUP_LIST_ICON_WRAP_SELECTOR).forEach(el => {
                    el.style.display = 'inline-flex';
                    el.style.alignItems = 'center';
                    el.style.justifyContent = 'center';
                    el.style.color = 'inherit';
                });
                document.querySelectorAll(POPUP_LIST_ICON_SELECTOR).forEach(el => {
                    el.style.fill = 'currentColor';
                    el.style.color = 'inherit';
                    el.style.width = '20px';
                    el.style.height = '20px';
                    el.style.display = 'block';
                });
            }

            function styleVideoStateAndPreview() {
                document.querySelectorAll(VIDEO_STATE_SELECTOR).forEach(el => el.style.color = THEME.textMuted);
                document.querySelectorAll(STATE_CHANGE_INDICATOR_SELECTOR).forEach(el => el.style.backgroundColor = 'transparent');
                document.querySelectorAll(TIMELINE_PREVIEW_IMAGE_SELECTOR).forEach(el => el.style.borderColor = THEME.textMuted);
                document.querySelectorAll(TIMELINE_PREVIEW_LABEL_TIME_SELECTOR).forEach(el => el.style.color = THEME.textMuted);
            }

            function styleSubtitles() {
                document.querySelectorAll(SUBTITLES_SELECTOR).forEach(el => {
                    el.style.letterSpacing = '-.24px';
                    el.style.position = 'absolute';
                    el.style.padding = '12px 16px';
                    el.style.borderRadius = '16px';
                    el.style.display = 'flex';
                    el.style.alignItems = 'start';
                    el.style.flexDirection = 'column';
                    el.style.color = '#fff';
                    el.style.backgroundColor = 'transparent';
                    el.style.transition = 'bottom .15s ease-out,opacity .1s ease-out';
                    el.style.opacity = '1';
                    el.style.fontSize = '19px';
                    el.style.textShadow = '0 0 4px rgba(0,0,0,.8),0 0 8px rgba(0,0,0,.6),1px 1px 2px rgba(0,0,0,.9)';
                });
            }

            function tick() {
                injectGlobalStyles();
                removeUnwantedElements();
                styleHeader();
                styleTime();
                styleIcons([PLAY_BUTTON_SELECTOR], [PLAY_BUTTON_SVG_SELECTOR], [PLAY_BUTTON_USE_SELECTOR]);
                styleIcons([FULLSCREEN_BUTTON_SELECTOR], [FULLSCREEN_SVG_SELECTOR], [FULLSCREEN_USE_SELECTOR]);
                styleIcons([CLOSE_BUTTON_SELECTOR], [CLOSE_SVG_SELECTOR], [CLOSE_USE_SELECTOR]);
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

            new MutationObserver(tick).observe(document.documentElement, { childList: true, subtree: true });

            ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'].forEach(evt =>
                document.addEventListener(evt, () => {
                    removeSettingsUI();
                    setTimeout(tick, 100);
                    setTimeout(tick, 400);
                    showSettingsTemporarily();
                })
            );

            ['mousemove', 'mousedown', 'keydown', 'touchstart', 'pointermove'].forEach(evt =>
                document.addEventListener(evt, showSettingsTemporarily, true)
            );

            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => { tick(); scheduleHideSettings(); });
            } else {
                tick();
                scheduleHideSettings();
            }
            setInterval(tick, 1000);
        })();
    }

    if (IS_STEAM && isSiteInfoEnabled() && isEnabled('steam_review')) {
        (function initSteam() {
            const THEME = {
                bg: '#09090f', card: '#101015', accent: '#c11f2b', accentHover: '#d4232f',
                text: '#e0e0ff', textMuted: '#a0a0cc', border: '#1e1e28'
            };
            const FONT = "'Inter', system-ui, -apple-system, sans-serif";
            const FONT_TITLE = "'Orbitron', 'Inter', sans-serif";

            function injectStyles() {
                if (document.getElementById('ripper-steam-styles')) return;
                const style = document.createElement('style');
                style.id = 'ripper-steam-styles';
                style.textContent = `
                    #ripper-game-block,#ripper-game-skeleton,#ripper-game-suggest{font-family:${FONT};background:${THEME.card};border:1px solid ${THEME.border};border-radius:18px;padding:0;margin:24px 0;color:${THEME.text};box-shadow:0 12px 48px rgba(0,0,0,.6);position:relative;overflow:hidden;line-height:1.6;isolation:isolate;box-sizing:border-box;width:100%;max-width:100%}
                    #ripper-game-block *,#ripper-game-skeleton *,#ripper-game-suggest *{box-sizing:border-box}
                    #ripper-game-block,#ripper-game-suggest{animation:rgpFadeIn .4s ease-out}
                    @keyframes rgpFadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
                    @keyframes rgpShimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
                    #ripper-game-skeleton .rgp-sk-header{display:flex;align-items:center;gap:14px;padding:20px 24px 16px;border-bottom:1px solid ${THEME.border};background:${THEME.bg}}
                    #ripper-game-skeleton .rgp-sk-info{display:flex;flex-direction:column;gap:8px;flex:1;min-width:0}
                    #ripper-game-skeleton .rgp-sk-line{background:linear-gradient(90deg,${THEME.border} 0%,#2a2a38 50%,${THEME.border} 100%);background-size:200% 100%;border-radius:6px;animation:rgpShimmer 1.4s ease-in-out infinite}
                    #ripper-game-skeleton .rgp-sk-name{height:18px;width:100px}
                    #ripper-game-skeleton .rgp-sk-status{height:11px;width:140px;opacity:.7}
                    #ripper-game-skeleton .rgp-sk-rank{width:54px;height:54px;flex-shrink:0;clip-path:polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);background:linear-gradient(90deg,${THEME.border} 0%,#2a2a38 50%,${THEME.border} 100%);background-size:200% 100%;animation:rgpShimmer 1.4s ease-in-out infinite}
                    #ripper-game-skeleton .rgp-sk-body{padding:20px 24px 22px;display:flex;flex-direction:column;gap:10px}
                    #ripper-game-skeleton .rgp-sk-text{height:12px;width:100%}
                    #ripper-game-skeleton .rgp-sk-text.short-1{width:92%}
                    #ripper-game-skeleton .rgp-sk-text.short-2{width:78%}
                    #ripper-game-skeleton .rgp-sk-text.short-3{width:60%}
                    #ripper-game-skeleton .rgp-sk-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 24px 18px;border-top:1px solid ${THEME.border};background:${THEME.bg};flex-wrap:wrap}
                    #ripper-game-skeleton .rgp-sk-date{height:12px;width:90px;border-radius:6px;background:linear-gradient(90deg,${THEME.border} 0%,#2a2a38 50%,${THEME.border} 100%);background-size:200% 100%;animation:rgpShimmer 1.4s ease-in-out infinite}
                    #ripper-game-skeleton .rgp-sk-btn{height:34px;width:170px;border-radius:10px;background:linear-gradient(90deg,${THEME.border} 0%,#2a2a38 50%,${THEME.border} 100%);background-size:200% 100%;animation:rgpShimmer 1.4s ease-in-out infinite}
                    #ripper-game-block .rgp-header,#ripper-game-suggest .rgp-header{display:flex;align-items:center;gap:14px;padding:20px 24px 16px;border-bottom:1px solid ${THEME.border};background:${THEME.bg}}
                    #ripper-game-block .rgp-info,#ripper-game-suggest .rgp-info{display:flex;flex-direction:column;gap:3px;min-width:0;flex:1}
                    #ripper-game-block .rgp-name,#ripper-game-suggest .rgp-name{font-family:${FONT_TITLE};font-weight:700;font-size:1.1rem;letter-spacing:.8px;color:#fff;text-shadow:0 1px 4px rgba(0,0,0,.6);line-height:1.2}
                    #ripper-game-block .rgp-status,#ripper-game-suggest .rgp-status{display:inline-flex;align-items:center;font-family:${FONT_TITLE};font-weight:700;font-size:.72rem;letter-spacing:1px;text-transform:uppercase;color:${THEME.textMuted};line-height:1}
                    #ripper-game-block .rgp-rank{display:inline-flex;align-items:center;justify-content:center;font-family:${FONT_TITLE};font-size:1.6rem;font-weight:900;color:#fff;width:54px;height:54px;text-shadow:0 3px 12px rgba(0,0,0,.7);clip-path:polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);position:relative;flex-shrink:0;filter:drop-shadow(0 4px 12px rgba(0,0,0,.5))}
                    #ripper-game-block .rgp-rank::before{content:'';position:absolute;inset:4px;clip-path:polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);background:rgba(16,16,21,.9);z-index:1}
                    #ripper-game-block .rgp-rank::after{content:'';position:absolute;inset:7px;clip-path:polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);background:rgba(16,16,21,.98);z-index:1}
                    #ripper-game-block .rgp-rank>span{position:relative;z-index:3;line-height:1}
                    #ripper-game-block .rgp-rank.rank-S{background:linear-gradient(135deg,#c11f2b,#6a0f17)}
                    #ripper-game-block .rgp-rank.rank-A{background:linear-gradient(135deg,#c11f2b,#8a1520)}
                    #ripper-game-block .rgp-rank.rank-B{background:linear-gradient(135deg,#8a1520,#4a0a10)}
                    #ripper-game-block .rgp-rank.rank-C{background:linear-gradient(135deg,#5a3a7a,#2a1a3a)}
                    #ripper-game-block .rgp-rank.rank-D{background:linear-gradient(135deg,#2a4a5a,#152530)}
                    #ripper-game-block .rgp-rank.rank-E{background:linear-gradient(135deg,#3a3a5a,#1a1a2e)}
                    #ripper-game-block .rgp-rank.rank-F{background:linear-gradient(135deg,#2a2a3a,#151520)}
                    #ripper-game-block .rgp-body{padding:20px 24px 22px;background:${THEME.card}}
                    #ripper-game-block .rgp-quote{font-size:.95rem;line-height:1.7;color:${THEME.text};white-space:pre-wrap;word-break:break-word;border-left:2px solid rgba(193,31,43,.35);padding-left:14px;max-height:360px;overflow-y:auto;scrollbar-width:thin;scrollbar-color:${THEME.accent} ${THEME.border}}
                    #ripper-game-block .rgp-quote::-webkit-scrollbar{width:6px}
                    #ripper-game-block .rgp-quote::-webkit-scrollbar-track{background:${THEME.border};border-radius:3px}
                    #ripper-game-block .rgp-quote::-webkit-scrollbar-thumb{background:${THEME.accent};border-radius:3px}
                    #ripper-game-block .rgp-footer,#ripper-game-suggest .rgp-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 24px 18px;border-top:1px solid ${THEME.border};background:${THEME.bg};flex-wrap:wrap}
                    #ripper-game-block .rgp-date{font-size:.8rem;color:${THEME.textMuted};font-style:italic;letter-spacing:.3px;display:flex;align-items:center;gap:8px}
                    #ripper-game-block .rgp-date svg{width:14px;height:14px;fill:currentColor;opacity:.7}
                    #ripper-game-block .rgp-link,#ripper-game-suggest .rgp-link{display:inline-flex;align-items:center;gap:8px;font-family:${FONT_TITLE};font-weight:700;font-size:.78rem;letter-spacing:1px;text-transform:uppercase;color:#fff;text-decoration:none;padding:9px 18px;border-radius:10px;background:${THEME.accent};box-shadow:0 4px 14px rgba(193,31,43,.3);transition:background .2s,transform .2s,box-shadow .2s;border:none;cursor:pointer}
                    #ripper-game-block .rgp-link:hover,#ripper-game-suggest .rgp-link:hover{background:${THEME.accentHover};transform:translateY(-1px);box-shadow:0 6px 20px rgba(193,31,43,.45);color:#fff;text-decoration:none}
                    #ripper-game-block .rgp-link svg,#ripper-game-suggest .rgp-link svg{width:13px;height:13px;fill:currentColor}
                    #ripper-game-block .rgp-footer-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
                    #ripper-game-block .rgp-back{display:inline-flex;align-items:center;gap:8px;font-family:${FONT_TITLE};font-weight:700;font-size:.75rem;letter-spacing:1px;text-transform:uppercase;color:${THEME.textMuted};background:transparent;border:1px solid ${THEME.border};padding:9px 16px;border-radius:10px;cursor:pointer;transition:color .2s,border-color .2s,background .2s}
                    #ripper-game-block .rgp-back:hover{color:#fff;border-color:${THEME.accent};background:rgba(193,31,43,.12)}
                    #ripper-game-block .rgp-back svg{width:13px;height:13px;fill:currentColor}
                    #ripper-game-suggest .rgp-suggest-body{padding:20px 24px 22px;display:flex;flex-direction:column;gap:14px;overflow:hidden}
                    #ripper-game-suggest .rgp-suggest-text{font-size:.93rem;line-height:1.6;color:${THEME.text};word-break:break-word}
                    #ripper-game-suggest .rgp-suggest-text strong{color:#fff;font-weight:600}
                    #ripper-game-suggest .rgp-suggest-search{position:relative;width:100%;max-width:100%}
                    #ripper-game-suggest .rgp-suggest-search-input{width:100%;max-width:100%;padding:12px 16px 12px 42px;background:${THEME.bg};border:1px solid ${THEME.border};border-radius:12px;color:${THEME.text};font-family:${FONT};font-size:.92rem;outline:none;transition:border-color .2s,box-shadow .2s}
                    #ripper-game-suggest .rgp-suggest-search-input::placeholder{color:${THEME.textMuted};opacity:.7}
                    #ripper-game-suggest .rgp-suggest-search-input:focus{border-color:${THEME.accent};box-shadow:0 0 0 3px rgba(193,31,43,.18)}
                    #ripper-game-suggest .rgp-suggest-search-icon{position:absolute;left:14px;top:50%;transform:translateY(-50%);width:16px;height:16px;fill:${THEME.textMuted};pointer-events:none;opacity:.7}
                    #ripper-game-suggest .rgp-suggest-list{display:flex;flex-direction:column;gap:8px;max-height:320px;overflow-y:auto;overflow-x:hidden;scrollbar-width:thin;scrollbar-color:${THEME.accent} ${THEME.border};padding-right:4px;width:100%;max-width:100%}
                    #ripper-game-suggest .rgp-suggest-list::-webkit-scrollbar{width:6px}
                    #ripper-game-suggest .rgp-suggest-list::-webkit-scrollbar-track{background:${THEME.border};border-radius:3px}
                    #ripper-game-suggest .rgp-suggest-list::-webkit-scrollbar-thumb{background:${THEME.accent};border-radius:3px}
                    #ripper-game-suggest .rgp-suggest-item{display:flex;align-items:center;gap:14px;padding:12px 16px;background:${THEME.bg};border:1px solid ${THEME.border};border-radius:12px;cursor:pointer;transition:background .2s,border-color .2s,transform .2s;user-select:none;width:100%;max-width:100%}
                    #ripper-game-suggest .rgp-suggest-item:hover{background:rgba(193,31,43,.12);border-color:${THEME.accent};transform:translateY(-1px)}
                    #ripper-game-suggest .rgp-suggest-item-title{flex:1;font-size:.95rem;font-weight:600;color:${THEME.text};min-width:0;word-break:break-word}
                    #ripper-game-suggest .rgp-suggest-item-rank{display:inline-flex;align-items:center;justify-content:center;font-family:${FONT_TITLE};font-size:1rem;font-weight:900;color:#fff;width:34px;height:34px;text-shadow:0 2px 8px rgba(0,0,0,.7);clip-path:polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);position:relative;flex-shrink:0}
                    #ripper-anime-block .rap-rank::before{content:'';position:absolute;inset:4px;clip-path:polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);background:rgba(16,16,21,.9);z-index:1}
                    #ripper-anime-block .rap-rank::after{content:'';position:absolute;inset:7px;clip-path:polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);background:rgba(16,16,21,.98);z-index:1}
                    #ripper-game-suggest .rgp-suggest-item-rank>span{position:relative;z-index:3;line-height:1}
                    #ripper-game-suggest .rgp-suggest-item-rank.rank-S{background:linear-gradient(135deg,#c11f2b,#6a0f17)}
                    #ripper-game-suggest .rgp-suggest-item-rank.rank-A{background:linear-gradient(135deg,#c11f2b,#8a1520)}
                    #ripper-game-suggest .rgp-suggest-item-rank.rank-B{background:linear-gradient(135deg,#8a1520,#4a0a10)}
                    #ripper-game-suggest .rgp-suggest-item-rank.rank-C{background:linear-gradient(135deg,#5a3a7a,#2a1a3a)}
                    #ripper-game-suggest .rgp-suggest-item-rank.rank-D{background:linear-gradient(135deg,#2a4a5a,#152530)}
                    #ripper-game-suggest .rgp-suggest-item-rank.rank-E{background:linear-gradient(135deg,#3a3a5a,#1a1a2e)}
                    #ripper-game-suggest .rgp-suggest-item-rank.rank-F,#ripper-game-suggest .rgp-suggest-item-rank.rank-_{background:linear-gradient(135deg,#2a2a3a,#151520)}
                    #ripper-game-suggest .rgp-suggest-empty{padding:20px 16px;text-align:center;color:${THEME.textMuted};font-size:.9rem;font-style:italic}
                    @media(max-width:640px){
                        #ripper-game-block .rgp-header,#ripper-game-skeleton .rgp-sk-header,#ripper-game-suggest .rgp-header{padding:16px 16px 14px;gap:12px}
                        #ripper-game-block .rgp-name,#ripper-game-suggest .rgp-name{font-size:1rem}
                        #ripper-game-block .rgp-rank,#ripper-game-skeleton .rgp-sk-rank{width:46px;height:46px;font-size:1.4rem}
                        #ripper-game-block .rgp-body,#ripper-game-skeleton .rgp-sk-body,#ripper-game-suggest .rgp-suggest-body{padding:16px 16px 18px}
                        #ripper-game-block .rgp-quote{font-size:.88rem;max-height:280px}
                        #ripper-game-block .rgp-footer,#ripper-game-skeleton .rgp-sk-footer,#ripper-game-suggest .rgp-footer{padding:12px 16px 16px;flex-direction:column;align-items:stretch}
                        #ripper-game-block .rgp-link,#ripper-game-suggest .rgp-link{justify-content:center;width:100%}
                        #ripper-game-block .rgp-footer-actions{flex-direction:column;align-items:stretch;width:100%}
                        #ripper-game-block .rgp-back{justify-content:center;width:100%}
                        #ripper-game-skeleton .rgp-sk-btn{width:100%}
                    }
                `;
                (document.head || document.documentElement).appendChild(style);
            }

            function createSkeleton() {
                const sk = document.createElement('div');
                sk.id = 'ripper-game-skeleton';
                sk.innerHTML = `<div class="rgp-sk-header"><div class="rgp-sk-info"><div class="rgp-sk-line rgp-sk-name"></div><div class="rgp-sk-line rgp-sk-status"></div></div><div class="rgp-sk-rank"></div></div><div class="rgp-sk-body"><div class="rgp-sk-line rgp-sk-text"></div><div class="rgp-sk-line rgp-sk-text short-1"></div><div class="rgp-sk-line rgp-sk-text short-2"></div><div class="rgp-sk-line rgp-sk-text short-3"></div></div><div class="rgp-sk-footer"><div class="rgp-sk-date"></div><div class="rgp-sk-btn"></div></div>`;
                return sk;
            }

            function getSteamTitle() {
                const el = document.querySelector('.apphub_AppName');
                if (el) return el.textContent.trim();
                const meta = document.querySelector('meta[property="og:title"]');
                if (meta) return meta.content.replace(/ on Steam$/, '').trim();
                return document.title.replace(/ on Steam$/, '').trim();
            }

            function slugify(title) { return encodeURIComponent(title); }

            function renderSuggestItem(game, index) {
                const rankClass = game.rang && game.rang !== '_' ? `rank-${game.rang}` : 'rank-_';
                const rankDisplay = game.rang && game.rang !== '_' ? game.rang : '?';
                return `<div class="rgp-suggest-item" data-index="${index}"><div class="rgp-suggest-item-title">${escapeHtml(game.title)}</div><div class="rgp-suggest-item-rank ${rankClass}"><span>${rankDisplay}</span></div></div>`;
            }

            function createSuggestBlock(steamTitle, initialSuggestions, db, onPick) {
                const block = document.createElement('div');
                block.id = 'ripper-game-suggest';
                block.innerHTML = `
                    <div class="rgp-header"><div class="rgp-info"><div class="rgp-name">RIPSITE</div><div class="rgp-status"><span>Выбор игры</span></div></div></div>
                    <div class="rgp-suggest-body">
                        <div class="rgp-suggest-text">Точного совпадения для <strong>«${escapeHtml(steamTitle)}»</strong> нет. Возможно, на сайте игра называется по-другому. Выберите вариант из списка или найдите через поиск.</div>
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
                    if (!items.length) { listEl.innerHTML = '<div class="rgp-suggest-empty">Ничего не найдено. Попробуйте другой запрос.</div>'; return; }
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
                    if (!q) { renderList(initialSuggestions); return; }
                    renderList(filterByQuery(q, db));
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
                if (isPlanned) statusText = 'В планах';
                else if (hasComment && hasRank) statusText = 'Отзыв и оценка';
                else if (hasComment) statusText = 'Отзыв';
                else statusText = 'Оценка';

                const rankHtml = hasRank ? `<div class="rgp-rank rank-${game.rang}"><span>${game.rang}</span></div>` : '';
                const bodyHtml = hasComment && !isPlanned ? `<div class="rgp-body"><div class="rgp-quote">${escapeHtml(game.comment)}</div></div>` : '';
                const dateHtml = game.date && game.date.trim() !== ''
                    ? `<div class="rgp-date"><svg viewBox="0 0 24 24"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/></svg>${escapeHtml(game.date)}</div>`
                    : '<div></div>';
                const reviewUrl = getPageUrl('/games.html') + '?game=' + slugify(game.title);
                const backBtnHtml = onBack
                    ? `<button class="rgp-back" type="button"><svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>Это не то</button>`
                    : '';

                block.innerHTML = `
                    <div class="rgp-header"><div class="rgp-info"><div class="rgp-name">RIPSITE</div><div class="rgp-status"><span>${statusText}</span></div></div>${rankHtml}</div>
                    ${bodyHtml}
                    <div class="rgp-footer">${dateHtml}<div class="rgp-footer-actions">${backBtnHtml}<a class="rgp-link" href="${reviewUrl}" target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 24 24"><path d="M14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7zM19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7z"/></svg>Открыть на RIPSITE</a></div></div>
                `;

                if (onBack) {
                    const b = block.querySelector('.rgp-back');
                    if (b) b.addEventListener('click', onBack);
                }
                return block;
            }

            function findInsertTarget() {
                const targets = ['.game_area_purchase_game_wrapper', '.game_area_purchase', '#game_area_purchase', '.glance_ctn', '.apphub_AppName', '#game_area_description'];
                for (const sel of targets) {
                    const el = document.querySelector(sel);
                    if (el && el.parentNode) return el;
                }
                return null;
            }

            function insertBlock(block) {
                const el = findInsertTarget();
                if (el) { el.parentNode.insertBefore(block, el.nextSibling); return true; }
                return false;
            }

            function waitForElement(selector, timeout = 10000) {
                return new Promise((resolve, reject) => {
                    const el = document.querySelector(selector);
                    if (el) return resolve(el);
                    const obs = new MutationObserver(() => {
                        const el = document.querySelector(selector);
                        if (el) { obs.disconnect(); resolve(el); }
                    });
                    obs.observe(document.body, { childList: true, subtree: true });
                    setTimeout(() => { obs.disconnect(); reject(new Error('Timeout ' + selector)); }, timeout);
                });
            }

            function fetchDatabase() {
                return gmFetchJson(getBaseUrl() + '/BD/game_database.json', DB_TIMEOUT_MS);
            }

            function removeAll() {
                ['ripper-game-block', 'ripper-game-skeleton', 'ripper-game-suggest'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.remove();
                });
                const offer = document.getElementById('ripper-mirror-offer-game');
                if (offer) offer.remove();
            }

            async function init() {
                injectStyles();
                removeAll();

                let steamTitle = getSteamTitle();
                if (!steamTitle) {
                    await waitForElement('.apphub_AppName').catch(() => { });
                    steamTitle = getSteamTitle();
                }
                if (!steamTitle) return;

                const skeleton = createSkeleton();
                if (!insertBlock(skeleton)) {
                    await waitForElement('.game_area_purchase_game_wrapper, .glance_ctn, #game_area_description')
                        .then(() => insertBlock(skeleton))
                        .catch(() => document.body.insertBefore(skeleton, document.body.firstChild));
                }

                try {
                    const db = await fetchDatabase();
                    const currentSk = document.getElementById('ripper-game-skeleton');
                    if (!currentSk) return;

                    function replaceWithSuggest() {
                        const cur = document.getElementById('ripper-game-suggest') || document.getElementById('ripper-game-block') || document.getElementById('ripper-game-skeleton');
                        if (!cur || !cur.parentNode) return;
                        const suggestions = findSuggestions(steamTitle, db);
                        const suggestBlock = createSuggestBlock(steamTitle, suggestions, db, (picked) => {
                            const c = document.getElementById('ripper-game-suggest');
                            if (!c) return;
                            c.parentNode.replaceChild(createBlock(picked, { onBack: () => replaceWithSuggest() }), c);
                        });
                        cur.parentNode.replaceChild(suggestBlock, cur);
                    }

                    function replaceWithBlock(game) {
                        const cur = document.getElementById('ripper-game-suggest') || document.getElementById('ripper-game-block') || document.getElementById('ripper-game-skeleton');
                        if (!cur || !cur.parentNode) return;
                        cur.parentNode.replaceChild(createBlock(game), cur);
                    }

                    let exact = null;
                    const norm = normalizeTitle(steamTitle);
                    for (const g of db) {
                        if (normalizeTitle(g.title) === norm) { exact = g; break; }
                    }

                    if (exact) replaceWithBlock(exact);
                    else replaceWithSuggest();
                } catch (e) {
                    console.warn('RIPMORE Steam:', e);
                    const sk = document.getElementById('ripper-game-skeleton');
                    if (sk && sk.parentNode) {
                        const errText = (e && e.message) ? e.message : 'Ошибка загрузки данных';
                        const offer = showMirrorOffer('game', sk,
                            () => { const o = document.getElementById('ripper-mirror-offer-game'); if (o) o.remove(); removeAll(); init(); },
                            () => { const o = document.getElementById('ripper-mirror-offer-game'); if (o) o.remove(); removeAll(); init(); },
                            errText
                        );
                        if (offer) sk.remove();
                    }
                }
            }

            if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
            else init();

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

    if (IS_SHIKIMORI && isSiteInfoEnabled() && isEnabled('shikimori_review')) {
        (function initShikimori() {
            const THEME = {
                bg: '#09090f', card: '#101015', accent: '#c11f2b', accentHover: '#d4232f',
                text: '#e0e0ff', textMuted: '#a0a0cc', border: '#1e1e28'
            };
            const FONT = "'Inter', system-ui, -apple-system, sans-serif";
            const FONT_TITLE = "'Orbitron', 'Inter', sans-serif";

            function injectStyles() {
                if (document.getElementById('ripper-anime-styles')) return;
                const style = document.createElement('style');
                style.id = 'ripper-anime-styles';
                style.textContent = `
                    #ripper-anime-block,#ripper-anime-skeleton,#ripper-anime-suggest{font-family:${FONT};background:${THEME.card};border:1px solid ${THEME.border};border-radius:18px;padding:0;margin:24px 0;color:${THEME.text};box-shadow:0 12px 48px rgba(0,0,0,.6);position:relative;overflow:hidden;line-height:1.6;isolation:isolate;box-sizing:border-box;width:100%;max-width:100%}
                    #ripper-anime-block *,#ripper-anime-skeleton *,#ripper-anime-suggest *{box-sizing:border-box}
                    #ripper-anime-block,#ripper-anime-suggest{animation:rapFadeIn .4s ease-out}
                    @keyframes rapFadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
                    @keyframes rapShimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
                    #ripper-anime-skeleton .rap-sk-header{display:flex;align-items:center;gap:14px;padding:20px 24px 16px;border-bottom:1px solid ${THEME.border};background:${THEME.bg}}
                    #ripper-anime-skeleton .rap-sk-info{display:flex;flex-direction:column;gap:8px;flex:1;min-width:0}
                    #ripper-anime-skeleton .rap-sk-line{background:linear-gradient(90deg,${THEME.border} 0%,#2a2a38 50%,${THEME.border} 100%);background-size:200% 100%;border-radius:6px;animation:rapShimmer 1.4s ease-in-out infinite}
                    #ripper-anime-skeleton .rap-sk-name{height:18px;width:100px}
                    #ripper-anime-skeleton .rap-sk-status{height:11px;width:140px;opacity:.7}
                    #ripper-anime-skeleton .rap-sk-rank{width:54px;height:54px;flex-shrink:0;clip-path:polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);background:linear-gradient(90deg,${THEME.border} 0%,#2a2a38 50%,${THEME.border} 100%);background-size:200% 100%;animation:rapShimmer 1.4s ease-in-out infinite}
                    #ripper-anime-skeleton .rap-sk-body{padding:20px 24px 22px;display:flex;flex-direction:column;gap:10px}
                    #ripper-anime-skeleton .rap-sk-text{height:12px;width:100%}
                    #ripper-anime-skeleton .rap-sk-text.short-1{width:92%}
                    #ripper-anime-skeleton .rap-sk-text.short-2{width:78%}
                    #ripper-anime-skeleton .rap-sk-text.short-3{width:60%}
                    #ripper-anime-skeleton .rap-sk-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 24px 18px;border-top:1px solid ${THEME.border};background:${THEME.bg};flex-wrap:wrap}
                    #ripper-anime-skeleton .rap-sk-date{height:12px;width:90px;border-radius:6px;background:linear-gradient(90deg,${THEME.border} 0%,#2a2a38 50%,${THEME.border} 100%);background-size:200% 100%;animation:rapShimmer 1.4s ease-in-out infinite}
                    #ripper-anime-skeleton .rap-sk-btn{height:34px;width:170px;border-radius:10px;background:linear-gradient(90deg,${THEME.border} 0%,#2a2a38 50%,${THEME.border} 100%);background-size:200% 100%;animation:rapShimmer 1.4s ease-in-out infinite}
                    #ripper-anime-block .rap-header,#ripper-anime-suggest .rap-header{display:flex;align-items:center;gap:14px;padding:20px 24px 16px;border-bottom:1px solid ${THEME.border};background:${THEME.bg}}
                    #ripper-anime-block .rap-info,#ripper-anime-suggest .rap-info{display:flex;flex-direction:column;gap:3px;min-width:0;flex:1}
                    #ripper-anime-block .rap-name,#ripper-anime-suggest .rap-name{font-family:${FONT_TITLE};font-weight:700;font-size:1.1rem;letter-spacing:.8px;color:#fff;text-shadow:0 1px 4px rgba(0,0,0,.6);line-height:1.2}
                    #ripper-anime-block .rap-status,#ripper-anime-suggest .rap-status{display:inline-flex;align-items:center;font-family:${FONT_TITLE};font-weight:700;font-size:.72rem;letter-spacing:1px;text-transform:uppercase;color:${THEME.textMuted};line-height:1}
                    #ripper-anime-block .rap-rank{display:inline-flex;align-items:center;justify-content:center;font-family:${FONT_TITLE};font-size:1.6rem;font-weight:900;color:#fff;width:54px;height:54px;text-shadow:0 3px 12px rgba(0,0,0,.7);clip-path:polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);position:relative;flex-shrink:0;filter:drop-shadow(0 4px 12px rgba(0,0,0,.5))}
                    #ripper-anime-block .rap-rank::before{content:'';position:absolute;inset:4px;clip-path:polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);background:rgba(16,16,21,.9);z-index:1}
                    #ripper-anime-block .rap-rank::after{content:'';position:absolute;inset:7px;clip-path:polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);background:rgba(16,16,21,.98);z-index:1}
                    #ripper-anime-block .rap-rank>span{position:relative;z-index:3;line-height:1}
                    #ripper-anime-block .rap-rank.rank-10{background:linear-gradient(135deg,#c11f2b,#6a0f17)}
                    #ripper-anime-block .rap-rank.rank-9{background:linear-gradient(135deg,#c11f2b,#8a1520)}
                    #ripper-anime-block .rap-rank.rank-8{background:linear-gradient(135deg,#8a1520,#4a0a10)}
                    #ripper-anime-block .rap-rank.rank-7{background:linear-gradient(135deg,#5a3a7a,#2a1a3a)}
                    #ripper-anime-block .rap-rank.rank-6{background:linear-gradient(135deg,#2a4a5a,#152530)}
                    #ripper-anime-block .rap-rank.rank-5{background:linear-gradient(135deg,#3a3a5a,#1a1a2e)}
                    #ripper-anime-block .rap-rank.rank-4,#ripper-anime-block .rap-rank.rank-3,#ripper-anime-block .rap-rank.rank-2,#ripper-anime-block .rap-rank.rank-1,#ripper-anime-block .rap-rank.rank-_{background:linear-gradient(135deg,#2a2a3a,#151520)}
                    #ripper-anime-block .rap-body{padding:20px 24px 22px;background:${THEME.card}}
                    #ripper-anime-block .rap-quote{font-size:.95rem;line-height:1.7;color:${THEME.text};white-space:pre-wrap;word-break:break-word;border-left:2px solid rgba(193,31,43,.35);padding-left:14px;max-height:360px;overflow-y:auto;scrollbar-width:thin;scrollbar-color:${THEME.accent} ${THEME.border}}
                    #ripper-anime-block .rap-quote::-webkit-scrollbar{width:6px}
                    #ripper-anime-block .rap-quote::-webkit-scrollbar-track{background:${THEME.border};border-radius:3px}
                    #ripper-anime-block .rap-quote::-webkit-scrollbar-thumb{background:${THEME.accent};border-radius:3px}
                    #ripper-anime-block .rap-footer,#ripper-anime-suggest .rap-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 24px 18px;border-top:1px solid ${THEME.border};background:${THEME.bg};flex-wrap:wrap}
                    #ripper-anime-block .rap-date{font-size:.8rem;color:${THEME.textMuted};font-style:italic;letter-spacing:.3px;display:flex;align-items:center;gap:8px}
                    #ripper-anime-block .rap-date svg{width:14px;height:14px;fill:currentColor;opacity:.7}
                    #ripper-anime-block .rap-link,#ripper-anime-suggest .rap-link{display:inline-flex;align-items:center;gap:8px;font-family:${FONT_TITLE};font-weight:700;font-size:.78rem;letter-spacing:1px;text-transform:uppercase;color:#fff;text-decoration:none;padding:9px 18px;border-radius:10px;background:${THEME.accent};box-shadow:0 4px 14px rgba(193,31,43,.3);transition:background .2s,transform .2s,box-shadow .2s;border:none;cursor:pointer}
                    #ripper-anime-block .rap-link:hover,#ripper-anime-suggest .rap-link:hover{background:${THEME.accentHover};transform:translateY(-1px);box-shadow:0 6px 20px rgba(193,31,43,.45);color:#fff;text-decoration:none}
                    #ripper-anime-block .rap-link svg,#ripper-anime-suggest .rap-link svg{width:13px;height:13px;fill:currentColor}
                    #ripper-anime-block .rap-footer-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
                    #ripper-anime-block .rap-back{display:inline-flex;align-items:center;gap:8px;font-family:${FONT_TITLE};font-weight:700;font-size:.75rem;letter-spacing:1px;text-transform:uppercase;color:${THEME.textMuted};background:transparent;border:1px solid ${THEME.border};padding:9px 16px;border-radius:10px;cursor:pointer;transition:color .2s,border-color .2s,background .2s}
                    #ripper-anime-block .rap-back:hover{color:#fff;border-color:${THEME.accent};background:rgba(193,31,43,.12)}
                    #ripper-anime-block .rap-back svg{width:13px;height:13px;fill:currentColor}
                    #ripper-anime-suggest .rap-suggest-body{padding:20px 24px 22px;display:flex;flex-direction:column;gap:14px;overflow:hidden}
                    #ripper-anime-suggest .rap-suggest-text{font-size:.93rem;line-height:1.6;color:${THEME.text};word-break:break-word}
                    #ripper-anime-suggest .rap-suggest-text strong{color:#fff;font-weight:600}
                    #ripper-anime-suggest .rap-suggest-search{position:relative;width:100%;max-width:100%}
                    #ripper-anime-suggest .rap-suggest-search-input{width:100%;max-width:100%;padding:12px 16px 12px 42px;background:${THEME.bg};border:1px solid ${THEME.border};border-radius:12px;color:${THEME.text};font-family:${FONT};font-size:.92rem;outline:none;transition:border-color .2s,box-shadow .2s}
                    #ripper-anime-suggest .rap-suggest-search-input::placeholder{color:${THEME.textMuted};opacity:.7}
                    #ripper-anime-suggest .rap-suggest-search-input:focus{border-color:${THEME.accent};box-shadow:0 0 0 3px rgba(193,31,43,.18)}
                    #ripper-anime-suggest .rap-suggest-search-icon{position:absolute;left:14px;top:50%;transform:translateY(-50%);width:16px;height:16px;fill:${THEME.textMuted};pointer-events:none;opacity:.7}
                    #ripper-anime-suggest .rap-suggest-list{display:flex;flex-direction:column;gap:8px;max-height:320px;overflow-y:auto;overflow-x:hidden;scrollbar-width:thin;scrollbar-color:${THEME.accent} ${THEME.border};padding-right:4px;width:100%;max-width:100%}
                    #ripper-anime-suggest .rap-suggest-list::-webkit-scrollbar{width:6px}
                    #ripper-anime-suggest .rap-suggest-list::-webkit-scrollbar-track{background:${THEME.border};border-radius:3px}
                    #ripper-anime-suggest .rap-suggest-list::-webkit-scrollbar-thumb{background:${THEME.accent};border-radius:3px}
                    #ripper-anime-suggest .rap-suggest-item{display:flex;align-items:center;gap:14px;padding:12px 16px;background:${THEME.bg};border:1px solid ${THEME.border};border-radius:12px;cursor:pointer;transition:background .2s,border-color .2s,transform .2s;user-select:none;width:100%;max-width:100%}
                    #ripper-anime-suggest .rap-suggest-item:hover{background:rgba(193,31,43,.12);border-color:${THEME.accent};transform:translateY(-1px)}
                    #ripper-anime-suggest .rap-suggest-item-title{flex:1;font-size:.95rem;font-weight:600;color:${THEME.text};min-width:0;word-break:break-word}
                    #ripper-anime-suggest .rap-suggest-item-rank{display:inline-flex;align-items:center;justify-content:center;font-family:${FONT_TITLE};font-size:1rem;font-weight:900;color:#fff;width:34px;height:34px;text-shadow:0 2px 8px rgba(0,0,0,.7);clip-path:polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);position:relative;flex-shrink:0}
                    #ripper-anime-suggest .rap-suggest-item-rank::before{content:'';position:absolute;inset:3px;clip-path:polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);background:rgba(16,16,21,.9);z-index:1}
                    #ripper-anime-suggest .rap-suggest-item-rank::after{content:'';position:absolute;inset:5px;clip-path:polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);background:rgba(16,16,21,.98);z-index:1}
                    #ripper-anime-suggest .rap-suggest-item-rank>span{position:relative;z-index:3;line-height:1}
                    #ripper-anime-suggest .rap-suggest-item-rank.rank-10{background:linear-gradient(135deg,#c11f2b,#6a0f17)}
                    #ripper-anime-suggest .rap-suggest-item-rank.rank-9{background:linear-gradient(135deg,#c11f2b,#8a1520)}
                    #ripper-anime-suggest .rap-suggest-item-rank.rank-8{background:linear-gradient(135deg,#8a1520,#4a0a10)}
                    #ripper-anime-suggest .rap-suggest-item-rank.rank-7{background:linear-gradient(135deg,#5a3a7a,#2a1a3a)}
                    #ripper-anime-suggest .rap-suggest-item-rank.rank-6{background:linear-gradient(135deg,#2a4a5a,#152530)}
                    #ripper-anime-suggest .rap-suggest-item-rank.rank-5{background:linear-gradient(135deg,#3a3a5a,#1a1a2e)}
                    #ripper-anime-suggest .rap-suggest-item-rank.rank-4,#ripper-anime-suggest .rap-suggest-item-rank.rank-3,#ripper-anime-suggest .rap-suggest-item-rank.rank-2,#ripper-anime-suggest .rap-suggest-item-rank.rank-1,#ripper-anime-suggest .rap-suggest-item-rank.rank-_{background:linear-gradient(135deg,#2a2a3a,#151520)}
                    #ripper-anime-suggest .rap-suggest-empty{padding:20px 16px;text-align:center;color:${THEME.textMuted};font-size:.9rem;font-style:italic}
                    @media(max-width:640px){
                        #ripper-anime-block .rap-header,#ripper-anime-skeleton .rap-sk-header,#ripper-anime-suggest .rap-header{padding:16px 16px 14px;gap:12px}
                        #ripper-anime-block .rap-name,#ripper-anime-suggest .rap-name{font-size:1rem}
                        #ripper-anime-block .rap-rank,#ripper-anime-skeleton .rap-sk-rank{width:46px;height:46px;font-size:1.4rem}
                        #ripper-anime-block .rap-body,#ripper-anime-skeleton .rap-sk-body,#ripper-anime-suggest .rap-suggest-body{padding:16px 16px 18px}
                        #ripper-anime-block .rap-quote{font-size:.88rem;max-height:280px}
                        #ripper-anime-block .rap-footer,#ripper-anime-skeleton .rap-sk-footer,#ripper-anime-suggest .rap-footer{padding:12px 16px 16px;flex-direction:column;align-items:stretch}
                        #ripper-anime-block .rap-link,#ripper-anime-suggest .rap-link{justify-content:center;width:100%}
                        #ripper-anime-block .rap-footer-actions{flex-direction:column;align-items:stretch;width:100%}
                        #ripper-anime-block .rap-back{justify-content:center;width:100%}
                        #ripper-anime-skeleton .rap-sk-btn{width:100%}
                    }
                `;
                (document.head || document.documentElement).appendChild(style);
            }

            function createSkeleton() {
                const sk = document.createElement('div');
                sk.id = 'ripper-anime-skeleton';
                sk.innerHTML = `<div class="rap-sk-header"><div class="rap-sk-info"><div class="rap-sk-line rap-sk-name"></div><div class="rap-sk-line rap-sk-status"></div></div><div class="rap-sk-rank"></div></div><div class="rap-sk-body"><div class="rap-sk-line rap-sk-text"></div><div class="rap-sk-line rap-sk-text short-1"></div><div class="rap-sk-line rap-sk-text short-2"></div><div class="rap-sk-line rap-sk-text short-3"></div></div><div class="rap-sk-footer"><div class="rap-sk-date"></div><div class="rap-sk-btn"></div></div>`;
                return sk;
            }

            function getShikimoriTitle() {
                const el = document.querySelector('header.head h1') || document.querySelector('header.head h2');
                if (!el) return '';
                const ruEl = el.querySelector('.name-ru');
                if (ruEl && ruEl.textContent.trim()) return ruEl.textContent.trim();
                let title = el.textContent.trim();
                const slashIdx = title.indexOf('/');
                if (slashIdx !== -1) title = title.slice(0, slashIdx).trim();
                return title;
            }

            function slugify(title) { return encodeURIComponent(title); }

            function renderSuggestItem(anime, index) {
                const rankClass = anime.rating && anime.rating !== '_' ? `rank-${anime.rating}` : 'rank-_';
                const rankDisplay = anime.rating && anime.rating !== '_' ? anime.rating : '?';
                return `<div class="rap-suggest-item" data-index="${index}"><div class="rap-suggest-item-title">${escapeHtml(anime.title)}</div><div class="rap-suggest-item-rank ${rankClass}"><span>${rankDisplay}</span></div></div>`;
            }

            function createSuggestBlock(shikiTitle, initialSuggestions, db, onPick) {
                const block = document.createElement('div');
                block.id = 'ripper-anime-suggest';
                block.innerHTML = `
                    <div class="rap-header"><div class="rap-info"><div class="rap-name">RIPSITE</div><div class="rap-status"><span>Выбор аниме</span></div></div></div>
                    <div class="rap-suggest-body">
                        <div class="rap-suggest-text">Точного совпадения для <strong>«${escapeHtml(shikiTitle)}»</strong> нет. Возможно, на сайте аниме называется по-другому. Выберите вариант из списка или найдите через поиск.</div>
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
                    if (!items.length) { listEl.innerHTML = '<div class="rap-suggest-empty">Ничего не найдено. Попробуйте другой запрос.</div>'; return; }
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
                    if (!q) { renderList(initialSuggestions); return; }
                    renderList(filterByQuery(q, db));
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
                if (isPlanned) statusText = 'В планах';
                else if (hasReview && hasRating) statusText = 'Отзыв и оценка';
                else if (hasReview) statusText = 'Отзыв';
                else statusText = 'Оценка';

                const rankHtml = hasRating ? `<div class="rap-rank rank-${anime.rating}"><span>${anime.rating}</span></div>` : '';
                const bodyHtml = hasReview && !isPlanned ? `<div class="rap-body"><div class="rap-quote">${escapeHtml(anime.review)}</div></div>` : '';
                const dateHtml = anime.date && anime.date.trim() !== ''
                    ? `<div class="rap-date"><svg viewBox="0 0 24 24"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/></svg>${escapeHtml(anime.date)}</div>`
                    : '<div></div>';
                const reviewUrl = getPageUrl('/anime.html') + '?anime=' + slugify(anime.slug || anime.title);
                const backBtnHtml = onBack
                    ? `<button class="rap-back" type="button"><svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>Это не то</button>`
                    : '';

                block.innerHTML = `
                    <div class="rap-header"><div class="rap-info"><div class="rap-name">RIPSITE</div><div class="rap-status"><span>${statusText}</span></div></div>${rankHtml}</div>
                    ${bodyHtml}
                    <div class="rap-footer">${dateHtml}<div class="rap-footer-actions">${backBtnHtml}<a class="rap-link" href="${reviewUrl}" target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 24 24"><path d="M14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7zM19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7z"/></svg>Открыть на RIPSITE</a></div></div>
                `;

                if (onBack) {
                    const b = block.querySelector('.rap-back');
                    if (b) b.addEventListener('click', onBack);
                }
                return block;
            }

            function findInsertTarget() { return document.querySelector('.resources-loader[data-dynamic="postloaded"]'); }

            function insertBlock(block) {
                const el = findInsertTarget();
                if (el && el.parentNode) { el.parentNode.insertBefore(block, el); return true; }
                return false;
            }

            function waitForElement(selector, timeout = 10000) {
                return new Promise((resolve, reject) => {
                    const el = document.querySelector(selector);
                    if (el) return resolve(el);
                    const obs = new MutationObserver(() => {
                        const el = document.querySelector(selector);
                        if (el) { obs.disconnect(); resolve(el); }
                    });
                    obs.observe(document.body, { childList: true, subtree: true });
                    setTimeout(() => { obs.disconnect(); reject(new Error('Timeout ' + selector)); }, timeout);
                });
            }

            function fetchDatabase() { return gmFetchJson(getBaseUrl() + '/BD/anime_database.json', DB_TIMEOUT_MS); }

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
                                slug: item.slug || item.image || ''
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
                            slug: item.slug || ''
                        });
                    }
                }
                return result;
            }

            async function init() {
                injectStyles();
                removeAll();

                let shikiTitle = getShikimoriTitle();
                if (!shikiTitle) {
                    await waitForElement('header.head h1, header.head h2').catch(() => { });
                    shikiTitle = getShikimoriTitle();
                }
                if (!shikiTitle) return;

                const skeleton = createSkeleton();
                if (!insertBlock(skeleton)) {
                    await waitForElement('.resources-loader[data-dynamic="postloaded"]')
                        .then(() => insertBlock(skeleton))
                        .catch(() => { });
                }

                try {
                    const db = await fetchDatabase();
                    const currentSk = document.getElementById('ripper-anime-skeleton');
                    if (!currentSk) return;

                    const allAnime = getAllAnime(db);

                    function replaceWithSuggest() {
                        const cur = document.getElementById('ripper-anime-suggest') || document.getElementById('ripper-anime-block') || document.getElementById('ripper-anime-skeleton');
                        if (!cur || !cur.parentNode) return;
                        const suggestions = findSuggestions(shikiTitle, allAnime);
                        const suggestBlock = createSuggestBlock(shikiTitle, suggestions, allAnime, (picked) => {
                            const c = document.getElementById('ripper-anime-suggest');
                            if (!c) return;
                            c.parentNode.replaceChild(createBlock(picked, { onBack: () => replaceWithSuggest() }), c);
                        });
                        cur.parentNode.replaceChild(suggestBlock, cur);
                    }

                    function replaceWithBlock(anime) {
                        const cur = document.getElementById('ripper-anime-suggest') || document.getElementById('ripper-anime-block') || document.getElementById('ripper-anime-skeleton');
                        if (!cur || !cur.parentNode) return;
                        cur.parentNode.replaceChild(createBlock(anime), cur);
                    }

                    let exact = null;
                    const norm = normalizeTitle(shikiTitle);
                    for (const g of allAnime) {
                        if (normalizeTitle(g.title) === norm) { exact = g; break; }
                    }

                    if (exact) replaceWithBlock(exact);
                    else replaceWithSuggest();
                } catch (e) {
                    console.warn('RIPMORE Anime:', e);
                    const sk = document.getElementById('ripper-anime-skeleton');
                    if (sk && sk.parentNode) {
                        const errText = (e && e.message) ? e.message : 'Ошибка загрузки данных';
                        const offer = showMirrorOffer('anime', sk,
                            () => { const o = document.getElementById('ripper-mirror-offer-anime'); if (o) o.remove(); removeAll(); init(); },
                            () => { const o = document.getElementById('ripper-mirror-offer-anime'); if (o) o.remove(); removeAll(); init(); },
                            errText
                        );
                        if (offer) sk.remove();
                    }
                }
            }

            if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
            else init();

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

    if (IS_RIPSITE) {
        (function initRipsite() {
            const IS_RIPMORE_PAGE = /\/ripmore(\.html)?$/i.test(location.pathname);

            const THEME = {
                bg: '#09090f', card: '#101015', accent: '#c11f2b', accentHover: '#d4232f',
                text: '#e0e0ff', textMuted: '#a0a0cc', border: '#1e1e28'
            };
            const FONT = "'Inter', system-ui, -apple-system, sans-serif";
            const FONT_TITLE = "'Orbitron', 'Inter', sans-serif";

            if (!IS_RIPMORE_PAGE && isEnabled('steam_widget')) {
                (function initSteamWidget() {
                    function injectEarlyHide() {
                        if (document.getElementById('ripper-steam-early-hide')) return;
                        const style = document.createElement('style');
                        style.id = 'ripper-steam-early-hide';
                        style.textContent = 'body:not(.ripper-ready) .steam-widget-section,body:not(.ripper-ready) .steam-widget-section *{visibility:hidden!important}';
                        (document.head || document.documentElement).appendChild(style);
                    }

                    function markReady() {
                        if (document.body) document.body.classList.add('ripper-ready');
                        else document.addEventListener('DOMContentLoaded', () => document.body.classList.add('ripper-ready'), { once: true });
                    }

                    function injectStyles() {
                        if (document.getElementById('ripper-steam-profile-styles')) return;
                        const style = document.createElement('style');
                        style.id = 'ripper-steam-profile-styles';
                        style.textContent = `
                            .ripper-steam-profile{font-family:${FONT};background:${THEME.card};border:1px solid ${THEME.border};border-radius:18px;padding:0;margin:.5rem auto 2rem;color:${THEME.text};box-shadow:0 12px 48px rgba(0,0,0,.6),0 0 0 1px rgba(193,31,43,.08);position:relative;overflow:hidden;line-height:1.6;isolation:isolate;box-sizing:border-box;width:100%;max-width:900px;animation:rspFadeIn .5s ease-out}
                            .ripper-steam-profile *{box-sizing:border-box}
                            @keyframes rspFadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
                            .ripper-steam-profile-header{display:flex;align-items:center;gap:18px;padding:22px 28px 18px;border-bottom:1px solid ${THEME.border};background:${THEME.bg};position:relative}
                            .ripper-steam-avatar-wrap{position:relative;flex-shrink:0;width:72px;height:72px;border-radius:50%;border:3px solid ${THEME.accent};box-shadow:0 0 0 3px ${THEME.bg},0 0 20px rgba(193,31,43,.4);overflow:hidden;background:${THEME.border}}
                            .ripper-steam-avatar{width:100%;height:100%;object-fit:cover;display:block}
                            .ripper-steam-info{display:flex;flex-direction:column;gap:6px;min-width:0;flex:1}
                            .ripper-steam-name{font-family:${FONT_TITLE};font-weight:700;font-size:1.35rem;letter-spacing:.8px;color:#fff;text-shadow:0 1px 4px rgba(0,0,0,.6);line-height:1.2;display:flex;align-items:center;gap:10px;flex-wrap:wrap}
                            .ripper-steam-name a{color:#fff;text-decoration:none;transition:color .2s}
                            .ripper-steam-name a:hover{color:${THEME.accent}}
                            .ripper-steam-status-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
                            .ripper-steam-status-badge{display:inline-flex;align-items:center;gap:8px;font-family:${FONT_TITLE};font-weight:700;font-size:.75rem;letter-spacing:1px;text-transform:uppercase;color:${THEME.textMuted};padding:5px 14px;border-radius:20px;background:${THEME.border};border:1px solid ${THEME.border};transition:background .2s,border-color .2s,color .2s}
                            .ripper-steam-status-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0;background:#898989;box-shadow:0 0 6px rgba(137,137,137,.5)}
                            .ripper-steam-status-badge.online .ripper-steam-status-dot{background:#57cbde;box-shadow:0 0 8px rgba(87,203,222,.8)}
                            .ripper-steam-status-badge.offline .ripper-steam-status-dot{background:#898989;box-shadow:0 0 6px rgba(137,137,137,.5)}
                            .ripper-steam-status-badge.in-game .ripper-steam-status-dot{background:#90ba3c;box-shadow:0 0 8px rgba(144,186,60,.8)}
                            .ripper-steam-status-badge.online{color:#57cbde;border-color:rgba(87,203,222,.3);background:rgba(87,203,222,.08)}
                            .ripper-steam-status-badge.offline{color:#898989;border-color:rgba(137,137,137,.2);background:rgba(137,137,137,.05)}
                            .ripper-steam-status-badge.in-game{color:#90ba3c;border-color:rgba(144,186,60,.3);background:rgba(144,186,60,.08)}
                            .ripper-steam-status-sep{opacity:.5;font-weight:400;margin:0 2px}
                            .ripper-steam-profile-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 28px 20px;border-top:1px solid ${THEME.border};background:${THEME.bg};flex-wrap:wrap}
                            .ripper-steam-profile-footer-text{font-size:.82rem;color:${THEME.textMuted};font-style:italic;letter-spacing:.3px;display:flex;align-items:center;gap:8px}
                            .ripper-steam-profile-footer-text svg{width:14px;height:14px;fill:currentColor;opacity:.7}
                            .ripper-steam-link{display:inline-flex;align-items:center;gap:8px;font-family:${FONT_TITLE};font-weight:700;font-size:.78rem;letter-spacing:1px;text-transform:uppercase;color:#fff;text-decoration:none;padding:10px 20px;border-radius:10px;background:${THEME.accent};box-shadow:0 4px 14px rgba(193,31,43,.3);transition:background .2s,transform .2s,box-shadow .2s;border:none;cursor:pointer}
                            .ripper-steam-link:hover{background:${THEME.accentHover};transform:translateY(-1px);box-shadow:0 6px 20px rgba(193,31,43,.45);color:#fff;text-decoration:none}
                            .ripper-steam-link svg{width:14px;height:14px;fill:currentColor}
                            @media(max-width:640px){
                                .ripper-steam-profile-header{padding:16px 16px 14px;gap:12px}
                                .ripper-steam-avatar-wrap{width:56px;height:56px;border-width:2px}
                                .ripper-steam-name{font-size:1.05rem}
                                .ripper-steam-status-badge{font-size:.68rem;padding:4px 10px}
                                .ripper-steam-profile-footer{padding:12px 16px 16px;flex-direction:column;align-items:stretch}
                                .ripper-steam-link{justify-content:center;width:100%}
                                .ripper-steam-profile-footer-text{justify-content:center}
                            }
                        `;
                        (document.head || document.documentElement).appendChild(style);
                    }

                    function getStatusInfo(statusText, inGameText, lastOnlineText) {
                        const status = (statusText || '').toLowerCase().trim();
                        const game = (inGameText || '').trim();
                        const last = (lastOnlineText || '').trim();
                        if (status.includes('не в сети') || status.includes('offline')) return { text: 'Не в сети', extra: last, class: 'offline' };
                        if (status.includes('в сети') || status.includes('online')) {
                            if (game !== '') return { text: game, extra: '', class: 'in-game' };
                            return { text: 'В сети', extra: '', class: 'online' };
                        }
                        if (game !== '') return { text: game, extra: '', class: 'in-game' };
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
                                <div class="ripper-steam-avatar-wrap"><img class="ripper-steam-avatar" src="${getSteamAvatarUrl()}" alt="RIPPER" onerror="this.style.display='none'"></div>
                                <div class="ripper-steam-info">
                                    <div class="ripper-steam-name"><a href="${STEAM_PROFILE_URL}" target="_blank" rel="noopener noreferrer">${data.personaName || 'RIPPER'}</a></div>
                                    <div class="ripper-steam-status-row"><div class="ripper-steam-status-badge ${status.class}"><span class="ripper-steam-status-dot"></span>${badgeContent}</div></div>
                                </div>
                            </div>
                            <div class="ripper-steam-profile-footer">
                                <div class="ripper-steam-profile-footer-text"><svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>Steam профиль</div>
                                <a class="ripper-steam-link" href="${STEAM_PROFILE_URL}" target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 24 24"><path d="M14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7zM19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7z"/></svg>Открыть профиль</a>
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
                                    if (isOffline) lastOnlineText = txt.replace(/^В сети:\s*/i, '').replace(/^Last Online:\s*/i, '');
                                    else inGameText = txt;
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
                        return { personaName, statusText, inGameText, lastOnlineText };
                    }

                    let state = 'idle';

                    function tryReplace() {
                        if (state !== 'idle') return;
                        const widget = document.querySelector('.steam-widget-section');
                        if (!widget) return;
                        if (widget.querySelector('.ripper-steam-profile')) { state = 'done'; markReady(); return; }
                        state = 'loading';
                        GM_xmlhttpRequest({
                            method: 'GET',
                            url: STEAM_PROFILE_URL,
                            onload: (response) => {
                                try {
                                    const data = parseSteamProfile(response.responseText);
                                    const block = buildProfileBlock(data);
                                    const w = document.querySelector('.steam-widget-section');
                                    if (w) { w.innerHTML = ''; w.appendChild(block); state = 'done'; }
                                    else state = 'idle';
                                } catch (e) { console.warn('RIPMORE Steam Profile:', e); state = 'idle'; }
                                markReady();
                            },
                            onerror: () => { state = 'idle'; markReady(); }
                        });
                    }

                    function init() {
                        injectEarlyHide();
                        injectStyles();
                        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', tryReplace);
                        else tryReplace();
                        const observer = new MutationObserver(() => {
                            if (state === 'done') {
                                const widget = document.querySelector('.steam-widget-section');
                                if (widget && !widget.querySelector('.ripper-steam-profile')) state = 'idle';
                                else return;
                            }
                            tryReplace();
                        });
                        if (document.body) observer.observe(document.body, { childList: true, subtree: true });
                        else document.addEventListener('DOMContentLoaded', () => observer.observe(document.body, { childList: true, subtree: true }), { once: true });
                    }

                    init();
                })();
            }


            if (!IS_RIPMORE_PAGE && isEnabled('tg_feed')) {
                (function initTelegramFeed() {
                    const CHANNEL = 'ripper_cmertanoc';
                    const PREVIEW_URL = `https://t.me/s/${CHANNEL}`;
                    const POSTS_LIMIT = 10;

                    const THEME = {
                        bg: '#09090f',
                        card: '#101015',
                        accent: '#c11f2b',
                        accentHover: '#d4232f',
                        text: '#e0e0ff',
                        textMuted: '#a0a0cc',
                        border: '#1e1e28',
                        borderHover: '#2a2a38',
                        success: '#57cbde'
                    };
                    const FONT = "'RIPMORE_Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
                    const FONT_TITLE = "'RIPMORE_Orbitron', 'RIPMORE_Inter', system-ui, sans-serif";
                    const FONT_MONO = "ui-monospace, Menlo, Consolas, 'Courier New', monospace";
                    const FONT_EMOJI = "'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji','Android Emoji','EmojiSymbols',sans-serif";

                    const WRAP_ID = 'ripper-tg-inline-feed';
                    const TEXT_CLASS = 'rtg-msg-text';

                    (function ensureScopedFonts() {
                        const id = 'rtg-scoped-fonts';
                        if (document.getElementById(id)) return;
                        const url = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Orbitron:wght@700;900&display=swap&subset=cyrillic,latin';

                        const applyCss = (css) => {
                            if (document.getElementById(id)) return;
                            const renamed = css
                                .replace(/font-family:\s*['"]?Inter['"]?/gi, "font-family:'RIPMORE_Inter'")
                                .replace(/font-family:\s*['"]?Orbitron['"]?/gi, "font-family:'RIPMORE_Orbitron'");
                            const style = document.createElement('style');
                            style.id = id;
                            style.textContent = renamed;
                            (document.head || document.documentElement).appendChild(style);
                        };

                        if (typeof GM_xmlhttpRequest === 'function') {
                            GM_xmlhttpRequest({
                                method: 'GET',
                                url: url,
                                onload: (resp) => {
                                    if (resp.status >= 200 && resp.status < 300 && resp.responseText) {
                                        applyCss(resp.responseText);
                                    }
                                }
                            });
                        } else {
                            fetch(url).then(r => r.text()).then(applyCss).catch(() => { });
                        }
                    })();

                    const style = document.createElement('style');
                    style.id = 'ripper-tg-inline-styles';
                    style.textContent = `
        #${WRAP_ID}{
            background:${THEME.card};
            border:1px solid ${THEME.border};
            border-radius:16px;
            padding:1.8rem 2.2rem;
            margin-bottom:2.2rem;
            font-family:${FONT};
        }
        #${WRAP_ID} *{box-sizing:border-box;font-family:inherit}

        .rtg-inline-head{
            display:flex;align-items:center;gap:12px;
            margin-bottom:1rem;flex-wrap:wrap;
        }
        .rtg-inline-head h3{
            color:${THEME.accent};
            font-family:${FONT_TITLE};
            font-size:1.5rem;font-weight:700;
            letter-spacing:1.2px;margin:0;
        }

        #${WRAP_ID} .rtg-feed{
            display:flex;flex-direction:column;gap:10px;
            max-height:560px;overflow-y:auto;
            padding-right:6px;
            scrollbar-width:thin;scrollbar-color:${THEME.border} transparent;
        }
        #${WRAP_ID} .rtg-feed::-webkit-scrollbar{width:6px}
        #${WRAP_ID} .rtg-feed::-webkit-scrollbar-thumb{background:${THEME.border};border-radius:3px}
        #${WRAP_ID} .rtg-feed::-webkit-scrollbar-track{background:transparent}

        .rtg-msg{
            background:${THEME.bg};
            border:1px solid ${THEME.border};
            border-radius:12px;
            padding:10px 14px 8px;
            font-size:13.5px;line-height:1.5;color:${THEME.text};
            word-wrap:break-word;overflow-wrap:anywhere;
        }

        #${WRAP_ID} .${TEXT_CLASS},
        #${WRAP_ID} .${TEXT_CLASS} *{
            font-family:${FONT} !important;
            font-size:13.5px !important;
            line-height:1.5 !important;
            vertical-align:baseline !important;
            letter-spacing:normal !important;
            word-spacing:normal !important;
            text-transform:none !important;
            float:none !important;
            position:static !important;

            font-feature-settings: "kern" 0, "liga" 0, "calt" 0, "clig" 0, "dlig" 0, "hlig" 0 !important;
            font-variant-ligatures: none !important;
            font-variant: normal !important;
            font-kerning: none !important;
            font-optical-sizing: none !important;
            text-rendering: geometricPrecision !important;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }

        #${WRAP_ID} .${TEXT_CLASS}{
            white-space:pre-wrap;
            word-wrap:break-word;
            overflow-wrap:anywhere;
            color:${THEME.text} !important;
            font-weight:400 !important;
            font-style:normal !important;
        }

        #${WRAP_ID} .${TEXT_CLASS} .emoji,
        #${WRAP_ID} .${TEXT_CLASS} tg-emoji,
        #${WRAP_ID} .${TEXT_CLASS} tg-emoji *{
            font-family:${FONT_EMOJI} !important;
            font-style:normal !important;
            font-weight:normal !important;
            font-size:1em !important;
            line-height:1.5 !important;
            vertical-align:baseline !important;
            display:inline !important;
            width:auto !important;
            height:auto !important;
            min-width:0 !important;
            min-height:0 !important;
            padding:0 !important;
            margin:0 !important;
            border:none !important;
            background:none !important;
            background-image:none !important;
            text-indent:0 !important;
            box-shadow:none !important;
            text-decoration:none !important;
            overflow:visible !important;
            text-shadow:none !important;
            -webkit-text-fill-color:currentColor !important;
            color:inherit !important;
            font-feature-settings: normal !important;
            font-variant-ligatures: normal !important;
        }

        #${WRAP_ID} .${TEXT_CLASS} a{
            color:#6ab2f2 !important;
            text-decoration:none !important;
            border-bottom:1px dashed rgba(106,178,242,.35);
            font-weight:500 !important;
        }
        #${WRAP_ID} .${TEXT_CLASS} a:hover{
            color:#8ec6ff !important;
            border-bottom-color:#8ec6ff;
        }

        #${WRAP_ID} .${TEXT_CLASS} b,
        #${WRAP_ID} .${TEXT_CLASS} strong{
            color:#fff !important;
            font-weight:700 !important;
        }

        #${WRAP_ID} .${TEXT_CLASS} i,
        #${WRAP_ID} .${TEXT_CLASS} em{
            font-style:italic !important;
            color:${THEME.textMuted} !important;
        }
        #${WRAP_ID} .${TEXT_CLASS} i .emoji,
        #${WRAP_ID} .${TEXT_CLASS} em .emoji{
            font-style:normal !important;
            color:inherit !important;
        }

        #${WRAP_ID} .${TEXT_CLASS} u{text-decoration:underline !important}
        #${WRAP_ID} .${TEXT_CLASS} s,
        #${WRAP_ID} .${TEXT_CLASS} del{text-decoration:line-through !important}
        #${WRAP_ID} .${TEXT_CLASS} ins{text-decoration:underline !important}
        #${WRAP_ID} .${TEXT_CLASS} mark{
            background:rgba(193,31,43,.25) !important;
            color:inherit !important;
        }
        #${WRAP_ID} .${TEXT_CLASS} tg-spoiler{
            background:${THEME.border} !important;
            color:transparent !important;
            border-radius:3px;
            transition:color .2s,background .2s;
        }
        #${WRAP_ID} .${TEXT_CLASS} tg-spoiler:hover{
            background:transparent !important;
            color:inherit !important;
        }

        #${WRAP_ID} .${TEXT_CLASS} code{
            font-family:${FONT_MONO} !important;
            background:${THEME.card} !important;
            border:1px solid ${THEME.border};
            border-radius:4px;
            padding:0 4px;
            color:${THEME.text} !important;
        }

        #${WRAP_ID} .${TEXT_CLASS} pre{
            font-family:${FONT_MONO} !important;
            background:${THEME.card};
            border:1px solid ${THEME.border};
            border-radius:8px;
            padding:8px 10px;
            overflow-x:auto;
            margin:6px 0;
            line-height:1.4 !important;
            white-space:pre !important;
        }
        #${WRAP_ID} .${TEXT_CLASS} pre code{
            background:none !important;
            border:none !important;
            padding:0 !important;
            font-family:${FONT_MONO} !important;
        }

        #${WRAP_ID} .${TEXT_CLASS} blockquote{
            border-left:3px solid ${THEME.accent};
            padding-left:10px;
            margin:6px 0;
            color:${THEME.textMuted} !important;
        }

        #${WRAP_ID} .${TEXT_CLASS} br{
            line-height:1.5 !important;
            font-size:13.5px !important;
        }

        .rtg-msg-media{
            margin-top:8px;border-radius:10px;overflow:hidden;
            background:transparent;
            line-height:0;
            max-width:420px;
            position:relative;
            display:inline-block;
        }
        .rtg-msg-media img{
            max-width:100%;max-height:320px;
            width:auto;height:auto;
            display:block;object-fit:contain;cursor:zoom-in;
        }
        .rtg-msg-media.rtg-video{cursor:pointer}
        .rtg-msg-media.rtg-video img{cursor:pointer}
        .rtg-msg-media.rtg-video::after{
            content:'';position:absolute;top:50%;left:50%;
            transform:translate(-50%,-50%);
            width:54px;height:54px;border-radius:50%;
            background:rgba(9,9,15,.72);
            border:2px solid rgba(255,255,255,.85);
            box-shadow:0 4px 18px rgba(0,0,0,.6);
            transition:background .2s,transform .2s;
            pointer-events:none;z-index:2;
        }
        .rtg-msg-media.rtg-video::before{
            content:'';position:absolute;top:50%;left:50%;
            transform:translate(-38%,-50%);
            width:0;height:0;border-style:solid;
            border-width:11px 0 11px 18px;
            border-color:transparent transparent transparent #fff;
            z-index:3;pointer-events:none;
            filter:drop-shadow(0 1px 3px rgba(0,0,0,.5));
        }
        .rtg-msg-media.rtg-video:hover::after{
            background:rgba(193,31,43,.85);
            transform:translate(-50%,-50%) scale(1.08);
        }
        .rtg-msg-media.rtg-video .rtg-video-label{
            position:absolute;bottom:8px;right:8px;
            background:rgba(9,9,15,.78);color:#fff;
            font-family:${FONT};font-size:11px;font-weight:600;
            padding:3px 8px;border-radius:6px;line-height:1.3;
            z-index:3;pointer-events:none;
        }

        .rtg-msg-foot{
            display:flex;align-items:center;justify-content:flex-end;
            gap:10px;margin-top:6px;
        }
        .rtg-msg-views{
            font-size:10.5px;color:${THEME.textMuted};
            font-variant-numeric:tabular-nums;
            display:inline-flex;align-items:center;gap:5px;
        }
        .rtg-msg-views svg{width:13px;height:13px;fill:currentColor;opacity:.75}
        .rtg-msg-time{
            font-size:10.5px;color:${THEME.textMuted};
            font-variant-numeric:tabular-nums;
            display:inline-flex;align-items:center;gap:5px;
        }
        .rtg-msg-time svg{width:11px;height:11px;fill:currentColor;opacity:.7}

        .rtg-skeleton{display:flex;flex-direction:column;gap:10px}
        .rtg-skel-msg{
            background:${THEME.bg};border:1px solid ${THEME.border};
            border-radius:12px;padding:12px;
            display:flex;flex-direction:column;gap:8px;
        }
        .rtg-skel-line{
            height:11px;border-radius:5px;
            background:linear-gradient(90deg,${THEME.border} 0%,#2a2a38 50%,${THEME.border} 100%);
            background-size:200% 100%;
            animation:rtgShimmerInline 1.4s ease-in-out infinite;
        }
        .rtg-skel-line.w1{width:100%}
        .rtg-skel-line.w2{width:82%}
        .rtg-skel-line.w3{width:55%}
        .rtg-skel-line.time{width:60px;height:9px;align-self:flex-end}
        @keyframes rtgShimmerInline{0%{background-position:200% 0}100%{background-position:-200% 0}}

        .rtg-state{
            padding:32px 20px;text-align:center;
            display:flex;flex-direction:column;align-items:center;gap:12px;
            color:${THEME.textMuted};font-size:13px;line-height:1.5;
        }
        .rtg-state-icon{
            width:48px;height:48px;border-radius:50%;
            display:inline-flex;align-items:center;justify-content:center;
            background:rgba(193,31,43,.12);border:1px solid rgba(193,31,43,.3);
            color:${THEME.accent};
        }
        .rtg-state-icon svg{width:22px;height:22px;fill:currentColor}
        .rtg-state.error .rtg-state-icon{background:rgba(229,115,115,.12);border-color:rgba(229,115,115,.3);color:#e57373}
        .rtg-state-title{font-family:${FONT_TITLE};font-weight:700;font-size:13px;letter-spacing:.5px;color:#fff}
        .rtg-state-text{max-width:280px}
        .rtg-retry{
            margin-top:4px;padding:8px 16px;border-radius:9px;
            background:${THEME.accent};border:1px solid ${THEME.accent};
            color:#fff;cursor:pointer;
            font-family:${FONT_TITLE};font-weight:700;
            font-size:11px;letter-spacing:.8px;text-transform:uppercase;
            transition:background .15s,transform .15s;
        }
        .rtg-retry:hover{background:${THEME.accentHover};transform:translateY(-1px)}

        #ripper-tg-viewer-modal {
            display: none;
            position: fixed;
            inset: 0;
            background: rgba(9, 9, 15, 0.96);
            backdrop-filter: blur(8px);
            z-index: 2147483647;
            align-items: center;
            justify-content: center;
            padding: 20px;
            font-family: ${FONT};
        }
        #ripper-tg-viewer-modal.open { display: flex; }
        #ripper-tg-viewer-modal .rtgv-content {
            position: relative;
            width: 100%;
            max-width: 1280px;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        #ripper-tg-viewer-modal .rtgv-image {
            max-width: 100%;
            max-height: 92vh;
            object-fit: contain;
            border-radius: 8px;
            box-shadow: 0 10px 40px rgba(0,0,0,.6);
            user-select: none;
        }
        #ripper-tg-viewer-modal .rtgv-close {
            position: absolute;
            top: 25px;
            right: 35px;
            background: none;
            border: none;
            color: rgba(255,255,255,.8);
            font-size: 2.8rem;
            cursor: pointer;
            z-index: 20;
            line-height: 1;
            padding: 5px 12px;
            transition: color .2s;
        }
        #ripper-tg-viewer-modal .rtgv-close:hover { color: #ff4d4d; }
        #ripper-tg-viewer-modal .rtgv-nav {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            background: none;
            border: none;
            color: rgba(255,255,255,.75);
            font-size: 4.5rem;
            font-weight: 300;
            cursor: pointer;
            padding: 20px 15px;
            line-height: 1;
            transition: all .2s ease;
            z-index: 10;
            text-shadow: 0 2px 10px rgba(0,0,0,.7);
            display: none;
        }
        #ripper-tg-viewer-modal .rtgv-nav:hover {
            color: white;
            transform: translateY(-50%) scale(1.15);
        }
        #ripper-tg-viewer-modal .rtgv-nav.left { left: 10px; }
        #ripper-tg-viewer-modal .rtgv-nav.right { right: 10px; }
        #ripper-tg-viewer-modal .rtgv-counter {
            position: absolute;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%);
            color: rgba(255,255,255,.7);
            font-size: 1rem;
            background: rgba(0,0,0,.5);
            padding: 6px 18px;
            border-radius: 30px;
            display: none;
        }

        @media (max-width:640px){
            #${WRAP_ID}{padding:1.4rem 1.2rem;margin-bottom:1.8rem}
            .rtg-inline-head h3{font-size:1.3rem}
            #${WRAP_ID} .rtg-feed{max-height:460px}
            .rtg-msg-media{max-width:100%}
            .rtg-msg-media img{max-height:240px}
            #${WRAP_ID} .${TEXT_CLASS},
            #${WRAP_ID} .${TEXT_CLASS} *{font-size:13px !important}
        }
    `;
                    (document.head || document.documentElement).appendChild(style);

                    let tgViewerImages = [];
                    let tgViewerIndex = 0;
                    let tgViewerModal = null;
                    let tgViewerImgEl = null;
                    let tgViewerCounterEl = null;
                    let tgViewerLeftBtn = null;
                    let tgViewerRightBtn = null;

                    function tgEnsureViewer() {
                        if (tgViewerModal && document.body.contains(tgViewerModal)) return;
                        tgViewerModal = document.createElement('div');
                        tgViewerModal.id = 'ripper-tg-viewer-modal';
                        tgViewerModal.innerHTML = `
            <div class="rtgv-content">
                <button class="rtgv-close" aria-label="Закрыть">×</button>
                <button class="rtgv-nav left" aria-label="Назад">‹</button>
                <img class="rtgv-image" src="" alt="">
                <button class="rtgv-nav right" aria-label="Вперёд">›</button>
                <div class="rtgv-counter"></div>
            </div>
        `;
                        document.body.appendChild(tgViewerModal);

                        tgViewerImgEl = tgViewerModal.querySelector('.rtgv-image');
                        tgViewerCounterEl = tgViewerModal.querySelector('.rtgv-counter');
                        tgViewerLeftBtn = tgViewerModal.querySelector('.rtgv-nav.left');
                        tgViewerRightBtn = tgViewerModal.querySelector('.rtgv-nav.right');

                        tgViewerModal.querySelector('.rtgv-close').addEventListener('click', tgCloseViewer);
                        tgViewerLeftBtn.addEventListener('click', tgPrevViewerImage);
                        tgViewerRightBtn.addEventListener('click', tgNextViewerImage);

                        tgViewerModal.addEventListener('click', (e) => {
                            if (e.target === tgViewerModal) tgCloseViewer();
                        });

                        document.addEventListener('keydown', tgOnViewerKey, true);
                    }

                    function tgOnViewerKey(e) {
                        if (!tgViewerModal || !tgViewerModal.classList.contains('open')) return;
                        if (e.key === 'Escape') { e.preventDefault(); tgCloseViewer(); }
                        if (e.key === 'ArrowRight') { e.preventDefault(); tgNextViewerImage(); }
                        if (e.key === 'ArrowLeft') { e.preventDefault(); tgPrevViewerImage(); }
                    }

                    function tgUpdateViewer() {
                        if (!tgViewerImages.length) return;
                        tgViewerImgEl.src = tgViewerImages[tgViewerIndex];
                        const multiple = tgViewerImages.length > 1;
                        tgViewerLeftBtn.style.display = multiple ? 'block' : 'none';
                        tgViewerRightBtn.style.display = multiple ? 'block' : 'none';
                        tgViewerCounterEl.style.display = multiple ? 'block' : 'none';
                        if (multiple) {
                            tgViewerCounterEl.textContent = `${tgViewerIndex + 1} / ${tgViewerImages.length}`;
                        }
                    }

                    function tgOpenViewer(urls, startIndex) {
                        tgEnsureViewer();
                        tgViewerImages = Array.isArray(urls) ? urls.filter(Boolean) : [urls];
                        tgViewerIndex = Math.max(0, Math.min(startIndex || 0, tgViewerImages.length - 1));
                        tgUpdateViewer();
                        tgViewerModal.classList.add('open');
                        tgViewerModal.style.display = 'flex';
                    }

                    function tgCloseViewer() {
                        if (!tgViewerModal) return;
                        tgViewerModal.classList.remove('open');
                        tgViewerModal.style.display = 'none';
                        tgViewerImgEl.src = '';
                    }

                    function tgNextViewerImage() {
                        if (tgViewerImages.length < 2) return;
                        tgViewerIndex = (tgViewerIndex + 1) % tgViewerImages.length;
                        tgUpdateViewer();
                    }

                    function tgPrevViewerImage() {
                        if (tgViewerImages.length < 2) return;
                        tgViewerIndex = (tgViewerIndex - 1 + tgViewerImages.length) % tgViewerImages.length;
                        tgUpdateViewer();
                    }

                    function escapeHtml(str) {
                        return String(str == null ? '' : str)
                            .replace(/&/g, '&amp;')
                            .replace(/</g, '&lt;')
                            .replace(/>/g, '&gt;')
                            .replace(/"/g, '&quot;')
                            .replace(/'/g, '&#39;');
                    }

                    function formatTime(iso) {
                        if (!iso) return '';
                        const d = new Date(iso);
                        if (isNaN(d.getTime())) return '';
                        const now = new Date();
                        const diffMs = now - d;
                        const diffMin = Math.round(diffMs / 60000);
                        if (diffMin < 1) return 'только что';
                        if (diffMin < 60) return `${diffMin} мин назад`;
                        const diffH = Math.round(diffMin / 60);
                        if (diffH < 24 && d.toDateString() === now.toDateString()) {
                            return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
                        }
                        const yesterday = new Date(now);
                        yesterday.setDate(now.getDate() - 1);
                        if (d.toDateString() === yesterday.toDateString()) {
                            return 'вчера, ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
                        }
                        return d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
                    }

                    function formatViews(n) {
                        if (n == null) return '';
                        const num = Number(n);
                        if (!isFinite(num) || num < 0) return '';
                        if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
                        if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
                        return String(num);
                    }

                    function skeletonHtml() {
                        const one = `<div class="rtg-skel-msg">
            <div class="rtg-skel-line w1"></div>
            <div class="rtg-skel-line w2"></div>
            <div class="rtg-skel-line w3"></div>
            <div class="rtg-skel-line time"></div>
        </div>`;
                        return `<div class="rtg-skeleton">${one.repeat(3)}</div>`;
                    }

                    function stateHtml(type, title, text, showRetry) {
                        const icons = {
                            error: '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>',
                            empty: '<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-3 12H7v-2h10v2zm0-3H7V9h10v2zm0-3H7V6h10v2z"/></svg>'
                        };
                        return `<div class="rtg-state ${type}">
            <div class="rtg-state-icon">${icons[type] || icons.empty}</div>
            <div class="rtg-state-title">${escapeHtml(title)}</div>
            <div class="rtg-state-text">${escapeHtml(text)}</div>
            ${showRetry ? '<button type="button" class="rtg-retry" data-rtg="retry">Повторить</button>' : ''}
        </div>`;
                    }

                    function sanitizeText(rootEl) {
                        rootEl.querySelectorAll('[style]').forEach(el => el.removeAttribute('style'));
                        rootEl.querySelectorAll('[align],[valign],[dir]').forEach(el => {
                            el.removeAttribute('align');
                            el.removeAttribute('valign');
                            el.removeAttribute('dir');
                        });

                        rootEl.querySelectorAll('tg-emoji').forEach(el => {
                            const ch = el.getAttribute('data-emoji')
                                || el.getAttribute('alt')
                                || el.getAttribute('title')
                                || (el.textContent || '').trim()
                                || '';
                            const span = document.createElement('span');
                            span.className = 'emoji';
                            span.textContent = ch;
                            el.replaceWith(span);
                        });

                        rootEl.querySelectorAll('i.emoji, em.emoji, i.tg-emoji, em.tg-emoji').forEach(el => {
                            const ch = el.getAttribute('alt')
                                || el.getAttribute('title')
                                || (el.textContent || '').trim()
                                || '';
                            const span = document.createElement('span');
                            span.className = 'emoji';
                            span.textContent = ch;
                            el.replaceWith(span);
                        });

                        rootEl.querySelectorAll('i, em').forEach(el => {
                            if (!el.textContent.trim() && !el.querySelector('img, br')) {
                                el.remove();
                            }
                        });
                    }

                    function parsePosts(html) {
                        const doc = new DOMParser().parseFromString(html, 'text/html');
                        const blocks = doc.querySelectorAll('.tgme_widget_message');
                        if (!blocks.length) return [];

                        return Array.from(blocks).slice(-POSTS_LIMIT).map(block => {
                            const textEl = block.querySelector('.tgme_widget_message_text');
                            let textHtml = '';
                            if (textEl) {
                                const clone = textEl.cloneNode(true);
                                clone.querySelectorAll('script').forEach(s => s.remove());
                                clone.querySelectorAll('*').forEach(el => {
                                    Array.from(el.attributes).forEach(attr => {
                                        if (/^on/i.test(attr.name)) el.removeAttribute(attr.name);
                                    });
                                });
                                sanitizeText(clone);
                                textHtml = clone.innerHTML;
                            }

                            const timeEl = block.querySelector('time[datetime]');
                            const iso = timeEl ? timeEl.getAttribute('datetime') : '';

                            let views = null;
                            const viewsEl = block.querySelector('.tgme_widget_message_views');
                            if (viewsEl) {
                                const raw = (viewsEl.textContent || '').trim();
                                if (raw) {
                                    const m = raw.match(/^([\d.,]+)\s*([KkMm])?$/);
                                    if (m) {
                                        let num = parseFloat(m[1].replace(',', '.'));
                                        if (m[2]) {
                                            const suffix = m[2].toLowerCase();
                                            if (suffix === 'k') num *= 1000;
                                            else if (suffix === 'm') num *= 1000000;
                                        }
                                        if (isFinite(num)) views = Math.round(num);
                                    } else {
                                        const digits = raw.replace(/[^\d]/g, '');
                                        if (digits) views = parseInt(digits, 10);
                                    }
                                }
                            }

                            let mediaHtml = '';
                            let mediaType = 'photo';
                            let durationText = '';

                            const videoPlayer = block.querySelector('.tgme_widget_message_video_player');
                            const videoThumb = block.querySelector('.tgme_widget_message_video_thumb');

                            if (videoPlayer || videoThumb) {
                                mediaType = 'video';
                                let thumbUrl = '';
                                const thumbEl = videoThumb || (videoPlayer && videoPlayer.querySelector('.tgme_widget_message_video_thumb'));
                                if (thumbEl) {
                                    const styleAttr = thumbEl.getAttribute('style') || '';
                                    const m = styleAttr.match(/url\(['"]?([^'")]+)['"]?\)/);
                                    if (m) thumbUrl = m[1].replace(/"/g, '&quot;');
                                }
                                const durEl = block.querySelector('.tgme_widget_message_video_duration');
                                if (durEl) durationText = (durEl.textContent || '').trim();
                                if (!durationText && videoPlayer) {
                                    const durEl2 = videoPlayer.querySelector('.tgme_widget_message_video_duration');
                                    if (durEl2) durationText = (durEl2.textContent || '').trim();
                                }
                                if (thumbUrl) {
                                    const label = durationText ? `<span class="rtg-video-label">${escapeHtml(durationText)}</span>` : '';
                                    mediaHtml = `<div class="rtg-msg-media rtg-video"><img src="${thumbUrl}" loading="lazy" alt="">${label}</div>`;
                                }
                            }

                            if (!mediaHtml) {
                                mediaType = 'photo';
                                const photoWrap = block.querySelector('.tgme_widget_message_photo_wrap');
                                if (photoWrap) {
                                    const styleAttr = photoWrap.getAttribute('style') || '';
                                    const m = styleAttr.match(/url\(['"]?([^'")]+)['"]?\)/);
                                    if (m) {
                                        const url = m[1].replace(/"/g, '&quot;');
                                        mediaHtml = `<div class="rtg-msg-media"><img src="${url}" loading="lazy" alt=""></div>`;
                                    }
                                }
                            }
                            if (!mediaHtml) {
                                const sticker = block.querySelector('.tgme_widget_message_sticker');
                                if (sticker) {
                                    const img = sticker.querySelector('img');
                                    if (img && img.src) {
                                        mediaHtml = `<div class="rtg-msg-media"><img src="${img.src.replace(/"/g, '&quot;')}" loading="lazy" alt=""></div>`;
                                    }
                                }
                            }

                            return { textHtml, iso, mediaHtml, mediaType, views };
                        });
                    }

                    function buildWrapper() {
                        const wrap = document.createElement('div');
                        wrap.id = WRAP_ID;
                        wrap.innerHTML = `
            <div class="rtg-inline-head">
                <h3></h3>
            </div>
            <div class="rtg-feed"></div>
        `;
                        return wrap;
                    }

                    function renderPosts(feedEl, posts) {
                        if (!posts.length) {
                            feedEl.innerHTML = stateHtml('empty', 'Постов не найдено', 'Канал может быть закрытым, или preview-версия t.me недоступна.', true);
                            return;
                        }

                        feedEl.innerHTML = '';

                        const allImageUrls = [];
                        posts.forEach(p => {
                            const imgMatch = p.mediaHtml && p.mediaHtml.match(/<img src="([^"]+)"/);
                            if (imgMatch) allImageUrls.push(imgMatch[1].replace(/&quot;/g, '"'));
                        });

                        posts.forEach((p) => {
                            const wrap = document.createElement('div');
                            wrap.className = 'rtg-msg';

                            let textHtml = p.textHtml || '';
                            if (!textHtml && !p.mediaHtml) {
                                textHtml = `<span style="color:${THEME.textMuted};font-style:italic">[пустое сообщение]</span>`;
                            }

                            const textBlock = textHtml ? `<div class="${TEXT_CLASS}">${textHtml}</div>` : '';
                            const mediaBlock = p.mediaHtml || '';

                            const viewsNum = p.views;
                            const viewsStr = viewsNum != null ? formatViews(viewsNum) : '';
                            const viewsBlock = viewsStr
                                ? `<span class="rtg-msg-views" title="${escapeHtml(String(viewsNum))} просмотров">
                       <svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zm0 12.5a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/></svg>
                       ${escapeHtml(viewsStr)}
                   </span>`
                                : '';

                            const timeStr = formatTime(p.iso);
                            const timeBlock = `<span class="rtg-msg-time">
                        <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm.5 5v5.25l4.5 2.67-.75 1.23L11 13V7h1.5z"/></svg>
                        ${escapeHtml(timeStr || '—')}
                    </span>`;

                            const footBlock = `<div class="rtg-msg-foot">${viewsBlock}${timeBlock}</div>`;

                            wrap.innerHTML = textBlock + mediaBlock + footBlock;

                            const mediaEl = wrap.querySelector('.rtg-msg-media');
                            const img = wrap.querySelector('.rtg-msg-media img');
                            if (img) {
                                if (p.mediaType === 'video') {
                                    mediaEl.addEventListener('click', () => {
                                        const target = `https://t.me/${CHANNEL}`;
                                        window.open(target, '_blank', 'noopener');
                                    });
                                } else {
                                    img.addEventListener('click', () => {
                                        if (!img.src) return;
                                        const idx = allImageUrls.indexOf(img.src);
                                        tgOpenViewer(allImageUrls, idx >= 0 ? idx : 0);
                                    });
                                }
                            }

                            feedEl.appendChild(wrap);
                        });

                        const scrollToBottom = () => {
                            feedEl.scrollTop = feedEl.scrollHeight;
                        };
                        scrollToBottom();
                        requestAnimationFrame(scrollToBottom);
                        setTimeout(scrollToBottom, 50);
                        setTimeout(scrollToBottom, 200);
                    }

                    function renderError(feedEl, text) {
                        feedEl.innerHTML = stateHtml('error', 'Ошибка загрузки', text, true);
                    }

                    function loadMessages(feedEl) {
                        feedEl.innerHTML = skeletonHtml();

                        GM_xmlhttpRequest({
                            method: 'GET',
                            url: PREVIEW_URL,
                            timeout: 15000,
                            headers: {
                                'Cache-Control': 'no-cache, no-store, must-revalidate',
                                'Pragma': 'no-cache',
                                'Expires': '0'
                            },
                            onload: (resp) => {
                                if (resp.status !== 200) {
                                    renderError(feedEl, `HTTP ${resp.status}. Telegram вернул ошибку.`);
                                    return;
                                }
                                try {
                                    const posts = parsePosts(resp.responseText);
                                    renderPosts(feedEl, posts);
                                } catch (e) {
                                    console.error('[RIPSITE TG] parse error:', e);
                                    renderError(feedEl, 'Не удалось разобрать ответ Telegram: ' + e.message);
                                }
                            },
                            onerror: () => {
                                renderError(feedEl, 'Сеть недоступна. Проверьте подключение к t.me.');
                            },
                            ontimeout: () => {
                                renderError(feedEl, 'Таймаут запроса. Telegram не ответил за 15 секунд.');
                            }
                        });
                    }

                    function insertFeed() {
                        const main = document.querySelector('main');
                        if (!main) return false;

                        const cards = Array.from(main.querySelectorAll('.card'));
                        const aboutCard = cards.find(c => {
                            const h3 = c.querySelector('h3');
                            return h3 && /обо\s*мне/i.test(h3.textContent);
                        });

                        if (!aboutCard) return false;
                        if (document.getElementById(WRAP_ID)) return true;

                        const wrap = buildWrapper();
                        const feedEl = wrap.querySelector('.rtg-feed');

                        aboutCard.parentNode.insertBefore(wrap, aboutCard);

                        feedEl.addEventListener('click', (e) => {
                            const retry = e.target.closest('[data-rtg="retry"]');
                            if (retry) {
                                e.preventDefault();
                                loadMessages(feedEl);
                            }
                        });

                        loadMessages(feedEl);
                        return true;
                    }

                    let attempts = 0;
                    const MAX_ATTEMPTS = 30;
                    const timer = setInterval(() => {
                        attempts++;
                        if (insertFeed() || attempts >= MAX_ATTEMPTS) {
                            clearInterval(timer);
                        }
                    }, 300);

                    const mo = new MutationObserver(() => {
                        if (insertFeed()) mo.disconnect();
                    });
                    mo.observe(document.documentElement, { childList: true, subtree: true });
                })();
            }

            if (IS_RIPMORE_PAGE) {
                (function initRipmorePage() {
                    const UW_SETTINGS_KEY_FOR_PAGE = 'ripmore_uw_config';
                    function normalizeUwDomainForPage(value) { return String(value || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/:\d+$/, '').replace(/^www\./, ''); }
                    function readUniversalWidgetStoreForSettings() {
                        try { const raw = GM_getValue(UW_SETTINGS_KEY_FOR_PAGE, null); const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw; if (parsed && parsed.sites) return { domains: Array.isArray(parsed.domains) ? parsed.domains : Object.keys(parsed.sites), sites: parsed.sites }; if (parsed && parsed.hostname) { const h = normalizeUwDomainForPage(parsed.hostname); return { domains: [h], sites: { [h]: parsed } }; } } catch (e) { }
                        return { domains: [], sites: {} };
                    }
                    function saveUniversalWidgetStoreForSettings(store) { try { GM_setValue(UW_SETTINGS_KEY_FOR_PAGE, JSON.stringify(store)); } catch (e) { } }
                    function renderPage() {
                        const statusCard = document.getElementById('statusCard');
                        const installCard = document.getElementById('installCard');
                        if (!statusCard && !installCard) return;

                        if (statusCard && !document.getElementById('ripmoreStatusContent')) {
                            statusCard.innerHTML = '<h3>Статус расширения</h3><div id="ripmoreStatusContent"></div>';
                        }
                        if (installCard && !document.getElementById('ripmoreSettingsContent')) {
                            installCard.innerHTML = '<h3>Настройки RIPMORE</h3><div id="ripmoreSettingsContent"></div>';
                        }

                        const statusContent = document.getElementById('ripmoreStatusContent');
                        if (statusContent) {
                            const s = getSettings();
                            statusContent.innerHTML = `
                                <div class="status-badge ${s.global ? 'ok' : 'fail'}">
                                    <span class="dot"></span>
                                    <span>${s.global ? 'Расширение активно' : 'Расширение отключено'}</span>
                                </div>
                                <p style="color:var(--text-muted);font-size:.95rem;margin-top:.6rem;">
                                    ${s.global ? 'Скрипт работает. Ниже можно включить или отключить отдельные функции.' : 'Все функции отключены. Включите общий переключатель, чтобы активировать скрипт.'}
                                </p>
                            `;
                        }

                        const settingsContent = document.getElementById('ripmoreSettingsContent');
                        if (settingsContent) {
                            const s = getSettings();
                            const siteInfoOn = s.global && s.site_info !== false;
                            const globalOn = s.global;
                            const rows = [
                                { key: 'global', label: 'Общий переключатель', desc: 'Включает или выключает все функции RIPMORE', disabled: false, dimmed: false },
                                { key: 'custom_player', label: 'Кастомный плеер', desc: 'Изменяет интерфейс видеоплеера на сайте', disabled: !globalOn, dimmed: !globalOn },
                                { key: 'site_info', label: 'Информация на страницах', desc: 'Общий переключатель для блоков отзывов на Steam, Shikimori, Кинопоиске и Anivox', disabled: !globalOn, dimmed: !globalOn },
                                { key: 'steam_review', label: 'Отзыв на Steam', desc: 'Добавляет блок с отзывом и оценкой на странице игры в Steam', disabled: !siteInfoOn, dimmed: !siteInfoOn, dependsOn: 'Информация на страницах' },
                                { key: 'shikimori_review', label: 'Отзыв на Shikimori', desc: 'Добавляет блок с отзывом и оценкой на странице аниме', disabled: !siteInfoOn, dimmed: !siteInfoOn, dependsOn: 'Информация на страницах' },
                                { key: 'kinopoisk_review', label: 'Отзыв на Кинопоиске', desc: 'Добавляет блок с отзывом и оценкой на странице фильма или сериала', disabled: !siteInfoOn, dimmed: !siteInfoOn, dependsOn: 'Информация на страницах' },
                                { key: 'anivox_review', label: 'Отзыв на Anivox', desc: 'Добавляет блок с отзывом и оценкой на странице аниме Anivox', disabled: !siteInfoOn, dimmed: !siteInfoOn, dependsOn: 'Информация на страницах' },
                                { key: 'steam_widget', label: 'Кастомный виджет Steam', desc: 'Заменяет стандартный виджет на сайте на странице с играми', disabled: !globalOn, dimmed: !globalOn },
                                { key: 'universal_widget', label: 'RIPINFO Виджет', desc: 'Отоброжает виджет RIPINFO на сайте. Блок с информацией продолжает работать на сохранённых доменах независимо от этого переключателя.', disabled: false, dimmed: false },
                                { key: 'twitch_enabled', label: 'Функции Twitch', desc: 'Бейджи зрителей, таблица лидеров, смайлы RIPSITE и медали в чате Twitch', disabled: !globalOn, dimmed: !globalOn },
                                { key: 'tg_feed', label: 'Лента Telegram', desc: 'Показывает 10 последних постов с тг перед блоком «Обо мне» на главной', disabled: !globalOn, dimmed: !globalOn },
                                { key: 'mirror_data', label: 'Загружать данные с зеркала', desc: 'Использовать rippertw.github.io для загрузки всех файлов', disabled: !globalOn, dimmed: !globalOn },
                                { key: 'mirror_pages', label: 'Открывать страницы на зеркале', desc: 'Ссылки «Открыть на RIPSITE» будут вести на rippertw.github.io вместо основного сайта', disabled: !globalOn, dimmed: !globalOn }
                            ];

                            let html = '<div style="display:flex;flex-direction:column;gap:.8rem;">';
                            rows.forEach(row => {
                                const checked = s[row.key] !== false;
                                const disabledAttr = row.disabled ? ' disabled' : '';
                                const dimmedStyle = row.dimmed ? 'opacity:.45;' : '';
                                const dependNote = row.dependsOn ? `<div style="font-size:.78rem;color:#e5534b;margin-top:.3rem;">Зависит от «${row.dependsOn}»</div>` : '';
                                html += `<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;padding:1rem 1.2rem;background:var(--bg);border:1px solid var(--border);border-radius:12px;${dimmedStyle}">
                                    <div style="flex:1;min-width:0;">
                                        <div style="font-weight:600;color:var(--text);margin-bottom:.2rem;">${row.label}</div>
                                        <div style="font-size:.85rem;color:var(--text-muted);line-height:1.4;">${row.desc}</div>${dependNote}
                                    </div>
                                    <label style="position:relative;display:inline-block;width:46px;height:26px;flex-shrink:0;cursor:${row.disabled ? 'not-allowed' : 'pointer'};margin-top:.2rem;">
                                        <input type="checkbox" data-setting="${row.key}" ${checked ? 'checked' : ''}${disabledAttr} style="opacity:0;width:0;height:0;position:absolute;">
                                        <span style="position:absolute;top:0;left:0;right:0;bottom:0;background:${checked && !row.disabled ? '#c11f2b' : '#2a2a38'};border-radius:26px;transition:.25s;display:block;"></span>
                                        <span style="position:absolute;top:3px;left:${checked ? '23px' : '3px'};width:20px;height:20px;background:#fff;border-radius:50%;transition:.25s;display:block;box-shadow:0 2px 4px rgba(0,0,0,.3);${row.disabled ? 'opacity:.6;' : ''}"></span>
                                    </label>
                                </div>`;
                                if (row.key === 'universal_widget') {
                                    const uwStore = readUniversalWidgetStoreForSettings();
                                    const domains = uwStore.domains;
                                    html += `<div style="margin:-.35rem 0 .25rem;padding:.9rem 1.2rem 1rem;background:var(--bg);border:1px solid var(--border);border-top:0;border-radius:0 0 12px 12px;">
                                        <div style="font-weight:600;color:var(--text);margin-bottom:.45rem;">Домены виджета</div>
                                        <div data-uw-settings-chips style="display:flex;flex-wrap:wrap;gap:.4rem;margin-bottom:.65rem;">${domains.length ? domains.map(host => `<button type="button" data-uw-remove-domain="${escapeHtml(host)}" title="Удалить ${escapeHtml(host)}" style="border:1px solid var(--border);background:#171720;color:var(--text);border-radius:999px;padding:.35rem .65rem;cursor:pointer;">${escapeHtml(host)} <b style="color:#e57373;margin-left:.25rem;">×</b></button>`).join('') : '<span style="color:var(--text-muted);font-size:.85rem;">Нет настроенных доменов</span>'}</div>
                                        <input data-uw-settings-domain-input value="${escapeHtml(domains.join(', '))}" placeholder="example.com, another.com" style="width:100%;padding:.65rem .75rem;background:var(--bg);border:1px solid var(--border);border-radius:8px;color:var(--text);">
                                        <div style="font-size:.8rem;color:var(--text-muted);margin-top:.4rem;">Укажите домены через запятую. Нажмите на домен выше, чтобы удалить настройки сайта.</div>
                                        <button type="button" data-uw-settings-domain-save class="btn" style="margin-top:.65rem;padding:.5rem .9rem;">Сохранить домены</button>
                                    </div>`;
                                }
                            });
                            html += '</div>';
                            html += `<div style="margin-top:1.4rem;padding-top:1.2rem;border-top:1px solid var(--border);">
                                <p style="font-size:.85rem;color:var(--text-muted);margin-bottom:.8rem;">После изменения настроек обновите страницу, чтобы применить их.</p>
                                <div class="buttons" style="margin-top:0;">
                                    <a href="${getPageUrl('/Files/RIPMORE/ripmore.user.js')}" class="btn" target="_blank" rel="noopener" style="background:var(--accent);">Установить RIPMORE</a>
                                    <a href="https://www.tampermonkey.net/" class="btn btn-outline" target="_blank" rel="noopener">Скачать Tampermonkey</a>
                                </div>
                                <p style="font-size:.85rem;color:var(--text-muted);margin-top:1rem;">Если Tampermonkey уже установлен — просто нажми «Установить RIPMORE», откроется окно установки.</p>
                            </div>`;
                            settingsContent.innerHTML = html;
                            settingsContent.querySelectorAll('input[data-setting]').forEach(input => {
                                input.addEventListener('change', function () {
                                    const key = this.getAttribute('data-setting');
                                    const s = getSettings();
                                    s[key] = this.checked;
                                    saveSettings(s);
                                    renderPage();
                                });
                            });
                            settingsContent.querySelectorAll('[data-uw-remove-domain]').forEach(button => button.addEventListener('click', function () {
                                const host = normalizeUwDomainForPage(this.getAttribute('data-uw-remove-domain'));
                                const store = readUniversalWidgetStoreForSettings();
                                store.domains = store.domains.map(normalizeUwDomainForPage).filter(h => h && h !== host);
                                delete store.sites[host];
                                saveUniversalWidgetStoreForSettings(store);
                                renderPage();
                            }));
                            const domainSave = settingsContent.querySelector('[data-uw-settings-domain-save]');
                            if (domainSave) domainSave.addEventListener('click', () => {
                                const input = settingsContent.querySelector('[data-uw-settings-domain-input]');
                                const wanted = [...new Set(String(input ? input.value : '').split(',').map(normalizeUwDomainForPage).filter(Boolean))];
                                const store = readUniversalWidgetStoreForSettings();
                                const previous = store.domains.map(normalizeUwDomainForPage).filter(Boolean);
                                previous.filter(host => !wanted.includes(host)).forEach(host => { delete store.sites[host]; });
                                wanted.forEach(host => { if (!store.sites[host]) store.sites[host] = { hostname: host, enabled: false, type: 'anime', types: ['anime'], titleSource: 'tab', titleSelector: '', titleAliases: {}, customRating: '', customReview: '', insertSelector: '', insertMode: 'after' }; });
                                store.domains = wanted;
                                saveUniversalWidgetStoreForSettings(store);
                                renderPage();
                            });
                        }
                    }

                    function injectToggleStyles() {
                        if (document.getElementById('ripmore-toggle-styles')) return;
                        const style = document.createElement('style');
                        style.id = 'ripmore-toggle-styles';
                        style.textContent = `
                            #ripmoreSettingsContent label input[type="checkbox"]:checked + span:first-of-type{background:#c11f2b!important}
                            #ripmoreSettingsContent label input[type="checkbox"] + span:first-of-type{background:#2a2a38}
                            #ripmoreSettingsContent label input[type="checkbox"]:disabled + span:first-of-type{background:#2a2a38!important}
                        `;
                        (document.head || document.documentElement).appendChild(style);
                    }

                    function start() {
                        injectToggleStyles();
                        renderPage();
                        const observer = new MutationObserver((mutations) => {
                            let shouldRender = false;
                            for (const m of mutations) {
                                if (m.target.id === 'statusCard' || m.target.id === 'installCard') { shouldRender = true; break; }
                            }
                            if (shouldRender) renderPage();
                        });
                        const statusCard = document.getElementById('statusCard');
                        const installCard = document.getElementById('installCard');
                        if (statusCard) observer.observe(statusCard, { childList: true, subtree: true });
                        if (installCard) observer.observe(installCard, { childList: true, subtree: true });
                    }

                    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
                    else start();
                })();
            }
        })();
    }

    if (IS_TWITCH && isEnabled('twitch_enabled')) {
        (function initTwitch() {
            let isRipperChannel = false;
            let twitchInitialized = false;
            let currentChannel = '';
            let twitchObserver = null;
            let smileInitialized = false;
            let twitchChatObserver = null;
            let twitchInterval = null;
            let twitchLeaderboardInterval = null;
            let smileButtonInterval = null;
            let twitchInitToken = 0;

            const THEME = {
                bg: '#09090f', card: '#101015', accent: '#c11f2b', accentHover: '#d4232f',
                gold: '#f5c518', silver: '#c0c0c0', bronze: '#cd7f32',
                red: '#c11f2b', gray: '#555555',
                text: '#e0e0ff', textMuted: '#a0a0cc', border: '#1e1e28'
            };
            const FONT = "'Inter', system-ui, -apple-system, sans-serif";
            const FONT_TITLE = "'Orbitron', 'Inter', sans-serif";
            const MAX_VISIBLE_ROWS = 10;
            const ROW_HEIGHT_PX = 34;
            const ROW_GAP_PX = 4;
            const LIST_PADDING_PX = 8;

            let TWITCH_RANK_MAP = null;
            let SMILE_MAP = {};
            let MEDALS_MAP = {};

            const UPLOAD_URL = 'https://sugi.moe/upload';
            const IMAGE_BASE = 'https://sugi.moe/';
            const ALLOWED_EXTS = ['png', 'jpeg', 'jpg', 'webp', 'gif'];
            const ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];
            const EXT_CACHE_MAX = 500;
            const extCache = new Map();
            let isUploading = false;

            function cacheSet(code, ext) {
                if (extCache.size >= EXT_CACHE_MAX) {
                    const firstKey = extCache.keys().next().value;
                    extCache.delete(firstKey);
                }
                extCache.set(code, ext);
            }

            function getUserMedals(username) {
                if (!username) return [];
                const lname = String(username).toLowerCase();
                const result = [];
                for (const key of Object.keys(MEDALS_MAP)) {
                    const medal = MEDALS_MAP[key];
                    const users = Array.isArray(medal.users) ? medal.users : [];
                    for (const u of users) {
                        if (String(u).toLowerCase() === lname) { result.push({ key, ...medal }); break; }
                    }
                }
                return result;
            }

            function getAllMedalsCount() { return Object.keys(MEDALS_MAP).length; }
            function getMedalsUsers(medalKey) {
                const medal = MEDALS_MAP[medalKey];
                return medal && Array.isArray(medal.users) ? medal.users.slice() : [];
            }

            function getTotalUniqueUsers() {
                const set = new Set();
                for (const key of Object.keys(MEDALS_MAP)) {
                    const users = MEDALS_MAP[key].users || [];
                    for (const u of users) set.add(String(u).toLowerCase());
                }
                return set.size;
            }

            function getMedalPercent(medalKey) {
                const total = getTotalUniqueUsers();
                if (total === 0) return 0;
                return Math.round((getMedalsUsers(medalKey).length / total) * 100);
            }

            let SMILE_KEYS = [];
            const EMOJI_CLASS = 'ripper-smile-emoji';
            const MENU_CANVAS_CLASS = 'ripper-smile-menu-canvas';
            const BTN_ID = 'ripper-smile-btn';
            const MENU_ID = 'ripper-smile-menu';
            const ROOT_ID = 'ripper-smile-root';
            const TOOLTIP_ID = 'ripper-smile-tooltip';

            const MENU_WIDTH = 320;
            const MENU_HEIGHT = 560;
            const BASE_SIZE = 28;
            const MENU_BUFFER = 64;

            const SETTINGS_KEY_SCALE = 'ripper_smile_scale';
            const SETTINGS_KEY_TOOLTIP = 'ripper_smile_tooltip';
            const SETTINGS_KEY_FAVS = 'ripper_smile_favorites';
            const SCALE_VALUES = [1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3];
            const DEFAULT_SCALE = 1;
            const DEFAULT_TOOLTIP = true;

            let smileCurrentScale = DEFAULT_SCALE;
            let smileTooltipEnabled = DEFAULT_TOOLTIP;
            let settingsPanelOpen = false;
            let menuOpen = false;
            let smileTooltipEl = null;
            let tooltipCurrentCode = null;
            let favorites = new Set();
            let menuSearchQuery = '';
            const webmPools = new Map();
            let visibilityObserver = null;

            function loadSmileSettings() {
                try {
                    const v = GM_getValue(SETTINGS_KEY_SCALE, DEFAULT_SCALE);
                    const n = parseFloat(v);
                    smileCurrentScale = (!isNaN(n) && n >= 1 && n <= 3) ? Math.round(n * 4) / 4 : DEFAULT_SCALE;
                    const t = GM_getValue(SETTINGS_KEY_TOOLTIP, DEFAULT_TOOLTIP);
                    smileTooltipEnabled = t !== false && t !== 'false';
                    const f = GM_getValue(SETTINGS_KEY_FAVS, '[]');
                    let arr = [];
                    try { arr = typeof f === 'string' ? JSON.parse(f) : f; } catch (e) { arr = []; }
                    favorites = new Set(Array.isArray(arr) ? arr.filter(x => typeof x === 'string') : []);
                } catch (e) {
                    smileCurrentScale = DEFAULT_SCALE;
                    smileTooltipEnabled = DEFAULT_TOOLTIP;
                    favorites = new Set();
                }
            }
            const saveSmileScale = v => { try { GM_setValue(SETTINGS_KEY_SCALE, v); } catch (e) { } };
            const saveSmileTooltip = v => { try { GM_setValue(SETTINGS_KEY_TOOLTIP, v); } catch (e) { } };
            const saveFavorites = () => { try { GM_setValue(SETTINGS_KEY_FAVS, JSON.stringify([...favorites])); } catch (e) { } };

            function emojiPx() { return Math.round(BASE_SIZE * smileCurrentScale); }
            function computeBufferSize() { return Math.max(32, Math.min(168, Math.round(emojiPx() * Math.min(window.devicePixelRatio || 1, 2)))); }

            function applyEmojiScale() {
                document.documentElement.style.setProperty('--ripper-smile-size', emojiPx() + 'px');
                const size = computeBufferSize();
                document.querySelectorAll('canvas.' + EMOJI_CLASS).forEach(c => {
                    if (c.width !== size || c.height !== size) { c.width = size; c.height = size; }
                });
            }

            let SMILE_CACHE = {};
            let SMILE_REGEX = null;
            let SMILE_TEST = null;

            function buildSmileCache() {
                SMILE_CACHE = {};
                SMILE_KEYS = Object.keys(SMILE_MAP)
                    .filter(k => !/^\d+$/.test(k))
                    .sort((a, b) => b.length - a.length);
                for (const k of SMILE_KEYS) {
                    const e = SMILE_MAP[k];
                    const ext = e.file.split('.').pop().toLowerCase();
                    SMILE_CACHE[k.toLowerCase()] = {
                        code: k, file: e.file, ext: ext === 'webm' ? 'webm' : 'webp', author: e.author || ''
                    };
                }
                if (SMILE_KEYS.length > 0) {
                    SMILE_REGEX = new RegExp(
                        '(^|[\\s.,!?;:()\\[\\]{}"\'`])(' + SMILE_KEYS.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')(?=$|[\\s.,!?;:()\\[\\]{}"\'`])',
                        'gi'
                    );
                    SMILE_TEST = new RegExp(SMILE_REGEX.source, 'i');
                } else {
                    SMILE_REGEX = null;
                    SMILE_TEST = null;
                }
            }

            function getSmileInfo(code) { return SMILE_CACHE[code.toLowerCase()] || null; }

            function getOrCreatePool(file) {
                let pool = webmPools.get(file);
                if (pool) return pool;
                const video = document.createElement('video');
                video.src = getSmileBaseUrl() + encodeURIComponent(file);
                video.loop = true;
                video.muted = true;
                video.playsInline = true;
                video.autoplay = false;
                video.preload = 'auto';
                video.disablePictureInPicture = true;
                video.disableRemotePlayback = true;
                video.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;';
                document.body.appendChild(video);
                pool = { file, video, users: new Set(), renderActive: false, raf: null };
                webmPools.set(file, pool);
                return pool;
            }

            function drawToCanvas(canvas, video) {
                try {
                    canvas.__ctx.clearRect(0, 0, canvas.width, canvas.height);
                    canvas.__ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                } catch (e) { }
            }

            function ensureRenderLoop(pool) {
                if (pool.renderActive || pool.users.size === 0) return;
                pool.renderActive = true;
                const video = pool.video;
                const tick = () => {
                    if (!pool.renderActive) return;
                    if (pool.users.size === 0) { pool.renderActive = false; if (!video.paused) video.pause(); return; }
                    if (video.readyState >= 2 && video.videoWidth > 0) {
                        for (const canvas of pool.users) {
                            if (!canvas.isConnected) { pool.users.delete(canvas); continue; }
                            drawToCanvas(canvas, video);
                        }
                    }
                    if (video.requestVideoFrameCallback) video.requestVideoFrameCallback(tick);
                    else pool.raf = requestAnimationFrame(tick);
                };
                if (video.requestVideoFrameCallback) video.requestVideoFrameCallback(tick);
                else pool.raf = requestAnimationFrame(tick);
            }

            function addCanvasToPool(pool, canvas) {
                if (pool.users.has(canvas)) return;
                pool.users.add(canvas);
                const tryPlay = () => {
                    if (pool.users.size === 0 || !pool.video.paused) return;
                    pool.video.play().catch(() => pool.video.addEventListener('canplay', tryPlay, { once: true }));
                };
                tryPlay();
                if (pool.video.readyState >= 2) drawToCanvas(canvas, pool.video);
                ensureRenderLoop(pool);
            }

            function removeCanvasFromPool(pool, canvas) { pool.users.delete(canvas); }

            function getVisibilityObserver() {
                if (visibilityObserver) return visibilityObserver;
                visibilityObserver = new IntersectionObserver((entries) => {
                    for (const entry of entries) {
                        const canvas = entry.target;
                        const pool = canvas.__pool;
                        if (!pool) continue;
                        if (entry.isIntersecting) addCanvasToPool(pool, canvas);
                        else {
                            removeCanvasFromPool(pool, canvas);
                            if (!canvas.isConnected) visibilityObserver.unobserve(canvas);
                        }
                    }
                }, { rootMargin: '150px' });
                return visibilityObserver;
            }

            function createPoolCanvas(code, file, bufferSize, tooltipInfo) {
                const canvas = document.createElement('canvas');
                canvas.setAttribute('data-ripper-smile-code', code);
                canvas.setAttribute('aria-label', code);
                canvas.width = bufferSize;
                canvas.height = bufferSize;
                canvas.__ctx = canvas.getContext('2d', { alpha: true });
                const pool = getOrCreatePool(file);
                canvas.__pool = pool;
                getVisibilityObserver().observe(canvas);
                if (tooltipInfo) {
                    canvas.addEventListener('mouseenter', (e) => { if (smileTooltipEnabled) showSmileTooltip(e.currentTarget, code, tooltipInfo); });
                    canvas.addEventListener('mouseleave', hideSmileTooltip);
                }
                return canvas;
            }

            function createSmileElement(code) {
                const info = getSmileInfo(code);
                if (!info) return null;
                let el;
                if (info.ext === 'webm') {
                    el = createPoolCanvas(code, info.file, computeBufferSize(), info);
                    el.className = EMOJI_CLASS;
                } else {
                    el = document.createElement('img');
                    el.src = getSmileBaseUrl() + encodeURIComponent(info.file);
                    el.loading = 'lazy';
                    el.decoding = 'async';
                    el.alt = code;
                    el.setAttribute('aria-label', code);
                    el.className = EMOJI_CLASS;
                    el.addEventListener('mouseenter', (e) => { if (smileTooltipEnabled) showSmileTooltip(e.currentTarget, code, info); });
                    el.addEventListener('mouseleave', hideSmileTooltip);
                }
                el.draggable = false;
                return el;
            }

            function ensureTooltipEl() {
                if (smileTooltipEl && document.body.contains(smileTooltipEl)) return smileTooltipEl;
                smileTooltipEl = document.createElement('div');
                smileTooltipEl.id = TOOLTIP_ID;
                document.body.appendChild(smileTooltipEl);
                return smileTooltipEl;
            }

            function showSmileTooltip(target, code, info) {
                const tip = ensureTooltipEl();
                if (tooltipCurrentCode !== code) {
                    tooltipCurrentCode = code;
                    const src = getSmileBaseUrl() + encodeURIComponent(info.file);
                    const media = info.ext === 'webm'
                        ? '<video src="' + src + '" autoplay loop muted playsinline></video>'
                        : '<img src="' + src + '" alt="">';
                    tip.innerHTML = '<div class="rst-media">' + media + '</div><div class="rst-code">' + escapeHtml(code) + '</div><div class="rst-author">' + escapeHtml(info.author || '—') + '</div>';
                }
                tip.classList.add('visible');
                const vid = tip.querySelector('video');
                if (vid && vid.paused) vid.play().catch(() => { });
                requestAnimationFrame(() => positionTooltip(target, tip));
            }

            function positionTooltip(target, tip) {
                const rect = target.getBoundingClientRect();
                const tipRect = tip.getBoundingClientRect();
                let left = rect.left + rect.width / 2 - tipRect.width / 2;
                let top = rect.top - tipRect.height - 8;
                if (top < 4) top = rect.bottom + 8;
                if (left < 4) left = 4;
                if (left + tipRect.width > window.innerWidth - 4) left = window.innerWidth - tipRect.width - 4;
                if (top + tipRect.height > window.innerHeight - 4) top = window.innerHeight - tipRect.height - 4;
                tip.style.left = left + 'px';
                tip.style.top = top + 'px';
            }

            function hideSmileTooltip() {
                if (!smileTooltipEl) return;
                smileTooltipEl.classList.remove('visible');
                const vid = smileTooltipEl.querySelector('video');
                if (vid && !vid.paused) vid.pause();
            }

            function replaceInTextNode(node) {
                if (!isSmilesEnabled()) return false;
                if (!SMILE_REGEX || !SMILE_TEST) return false;
                const text = node.nodeValue;
                if (!text || !SMILE_TEST.test(text)) return false;
                SMILE_REGEX.lastIndex = 0;
                const fragment = document.createDocumentFragment();
                let lastIndex = 0;
                let match;
                let replaced = false;
                while ((match = SMILE_REGEX.exec(text)) !== null) {
                    const prefix = match[1];
                    const code = match[2];
                    const codeStart = match.index + prefix.length;
                    if (codeStart > lastIndex) fragment.appendChild(document.createTextNode(text.slice(lastIndex, codeStart)));
                    const el = createSmileElement(code);
                    if (el) { fragment.appendChild(el); replaced = true; }
                    else fragment.appendChild(document.createTextNode(code));
                    lastIndex = codeStart + code.length;
                    if (match.index === SMILE_REGEX.lastIndex) SMILE_REGEX.lastIndex++;
                }
                if (!replaced) return false;
                if (lastIndex < text.length) fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
                node.parentNode.replaceChild(fragment, node);
                return true;
            }

            function isEditable(parent) {
                if (!parent) return false;
                return parent.isContentEditable ||
                    parent.closest('[contenteditable="true"]') ||
                    parent.closest('[contenteditable=""]') ||
                    parent.closest('[role="textbox"]') ||
                    parent.closest('[data-a-target="chat-input"]') ||
                    parent.closest('[data-slate-editor]') ||
                    parent.closest('[data-slate-editor="true"]') ||
                    false;
            }

            function shouldSkipParent(parent) {
                if (!parent) return true;
                if (isEditable(parent)) return true;
                if (parent.closest('.' + EMOJI_CLASS)) return true;
                if (parent.closest('a,button,code,pre,textarea,input,script,style')) return true;
                if (parent.closest('#' + ROOT_ID)) return true;
                if (parent.closest('#' + MENU_ID)) return true;
                if (parent.closest('#ripper-medal-tooltip,.ripper-medals-popup,.ripper-rank-badge,.ripper-leaderboard,.ripper-medals-popup-users')) return true;
                return false;
            }

            function processSubtree(root) {
                if (!root) return;
                if (!isSmilesEnabled()) return;
                if (!SMILE_REGEX || !SMILE_TEST) return;
                const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
                    acceptNode(node) {
                        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
                        if (shouldSkipParent(node.parentElement)) return NodeFilter.FILTER_REJECT;
                        if (!SMILE_TEST.test(node.nodeValue)) return NodeFilter.FILTER_REJECT;
                        return NodeFilter.FILTER_ACCEPT;
                    }
                });
                const nodes = [];
                while (walker.nextNode()) nodes.push(walker.currentNode);
                for (const n of nodes) replaceInTextNode(n);
            }

            const pendingChatRoots = new Set();
            const pendingTextNodes = new Set();
            let flushScheduled = false;

            function scheduleFlush() {
                if (flushScheduled) return;
                flushScheduled = true;
                requestAnimationFrame(() => {
                    flushScheduled = false;
                    if (!isRipperChannel || !isSmilesEnabled()) {
                        pendingChatRoots.clear();
                        pendingTextNodes.clear();
                        return;
                    }
                    const chats = [...pendingChatRoots];
                    const texts = [...pendingTextNodes];
                    pendingChatRoots.clear();
                    pendingTextNodes.clear();
                    for (const root of chats) if (root.isConnected) processSubtree(root);
                    for (const n of texts) if (n.isConnected) replaceInTextNode(n);
                });
            }

            function startSmileObserver() {
                if (twitchChatObserver) twitchChatObserver.disconnect();
                twitchChatObserver = new MutationObserver((mutations) => {
                    if (!isRipperChannel) return;
                    if (!isSmilesEnabled()) return;
                    for (const m of mutations) {
                        if (m.type === 'childList') {
                            for (const node of m.addedNodes) {
                                if (node.nodeType !== 1) continue;
                                if (shouldSkipParent(node)) continue;
                                if (node.classList && node.classList.contains('chat-line__message')) pendingChatRoots.add(node);
                                else if (node.querySelector) {
                                    const msgs = node.querySelectorAll('.chat-line__message');
                                    for (const msg of msgs) pendingChatRoots.add(msg);
                                }
                            }
                        } else if (m.type === 'characterData') {
                            const n = m.target;
                            if (n && n.nodeType === 3 && !shouldSkipParent(n.parentElement)) {
                                if (n.parentElement && n.parentElement.closest('.chat-line__message')) {
                                    pendingTextNodes.add(n);
                                }
                            }
                        }
                    }
                    if (pendingChatRoots.size || pendingTextNodes.size) scheduleFlush();
                });
                twitchChatObserver.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
            }

            function injectSmileStyles() {
                if (document.getElementById('ripper-smile-styles')) return;
                const style = document.createElement('style');
                style.id = 'ripper-smile-styles';
                style.textContent = `
                    :root{--ripper-smile-size:${emojiPx()}px}
                    .${EMOJI_CLASS}{display:inline-block;vertical-align:middle;width:var(--ripper-smile-size);height:var(--ripper-smile-size);margin:0 1px;object-fit:contain;cursor:pointer;content-visibility:auto}
                    #${TOOLTIP_ID}{position:fixed;z-index:2147483647;background:#101015;border:1px solid #1e1e28;border-radius:8px;padding:10px;box-shadow:0 8px 32px rgba(0,0,0,.75);display:none;flex-direction:column;align-items:center;gap:6px;font-family:'Inter','Roobert',system-ui,-apple-system,sans-serif;color:#e0e0ff;pointer-events:none;min-width:100px;max-width:200px}
                    #${TOOLTIP_ID}.visible{display:flex}
                    #${TOOLTIP_ID} .rst-media img,#${TOOLTIP_ID} .rst-media video{width:48px;height:48px;object-fit:contain;display:block}
                    #${TOOLTIP_ID} .rst-code{font-size:13px;font-weight:700;color:#c11f2b;padding:2px 8px;background:rgba(193,31,43,.15);border-radius:4px;text-align:center;word-break:break-all;max-width:100%}
                    #${TOOLTIP_ID} .rst-author{font-size:11px;color:#a0a0cc;font-weight:600;text-align:center;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
                    #${ROOT_ID}{position:relative;display:inline-flex;align-items:center;justify-content:center;vertical-align:middle;margin:0 2px;height:32px;width:32px;flex-shrink:0;line-height:0}
                    #${BTN_ID}{display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;padding:0;margin:0;background:transparent;border:none;border-radius:4px;cursor:pointer;transition:background .15s;flex-shrink:0;vertical-align:middle;line-height:0}
                    #${BTN_ID}:hover{background:rgba(255,255,255,.1)}
                    #${BTN_ID} img{width:24px;height:24px;object-fit:cover;border-radius:4px;display:block;pointer-events:none}
                    #${MENU_ID}{position:fixed;z-index:2147483647;width:${MENU_WIDTH}px;height:${MENU_HEIGHT}px;max-height:calc(100vh - 16px);background:#101015;border:1px solid #1e1e28;border-radius:8px;box-shadow:0 8px 32px rgba(0,0,0,.7);display:none;flex-direction:column;overflow:hidden;font-family:'Inter','Roobert',system-ui,-apple-system,sans-serif;color:#e0e0ff}
                    #${MENU_ID}.open{display:flex}
                    #${MENU_ID} .rsm-header{display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid #1e1e28;background:#09090f;flex-shrink:0}
                    #${MENU_ID} .rsm-header img{width:20px;height:20px;border-radius:3px;display:block}
                    #${MENU_ID} .rsm-header-title{font-size:13px;font-weight:700;letter-spacing:.5px;flex:1}
                    #${MENU_ID} .rsm-settings-toggle{width:24px;height:24px;display:inline-flex;align-items:center;justify-content:center;background:transparent;border:none;border-radius:4px;cursor:pointer;color:#a0a0cc;transition:background .15s,color .15s;padding:0}
                    #${MENU_ID} .rsm-settings-toggle:hover,#${MENU_ID} .rsm-settings-toggle.active{background:rgba(193,31,43,.15);color:#c11f2b}
                    #${MENU_ID} .rsm-settings-toggle svg{width:16px;height:16px;fill:currentColor;display:block}
                    #${MENU_ID} .rsm-settings{display:none;padding:10px 12px;border-bottom:1px solid #1e1e28;background:#09090f;flex-shrink:0;flex-direction:column;gap:12px}
#${MENU_ID} .rsm-settings.open{display:flex;flex:1 1 auto;min-height:0;max-height:calc(100% - 40px);overflow-y:auto;overflow-x:hidden;scrollbar-width:thin;scrollbar-color:#1e1e28 transparent}
#${MENU_ID} .rsm-settings.open::-webkit-scrollbar{width:6px}
#${MENU_ID} .rsm-settings.open::-webkit-scrollbar-track{background:transparent}
#${MENU_ID} .rsm-settings.open::-webkit-scrollbar-thumb{background:#1e1e28;border-radius:3px}
                    #${MENU_ID} .rsm-settings-section{display:flex;flex-direction:column;gap:6px}
                    #${MENU_ID} .rsm-settings-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#a0a0cc;display:flex;justify-content:space-between;align-items:center}
                    #${MENU_ID} .rsm-settings-value{color:#c11f2b;font-weight:700;font-size:12px;text-transform:none;letter-spacing:0}
                    #${MENU_ID} .rsm-slider-wrap{position:relative;padding:4px 0}
                    #${MENU_ID} .rsm-slider{-webkit-appearance:none;appearance:none;width:100%;height:4px;background:#1e1e28;border-radius:2px;outline:none;cursor:pointer;margin:0}
                    #${MENU_ID} .rsm-slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:14px;height:14px;background:#c11f2b;border-radius:50%;cursor:pointer;transition:background .15s;box-shadow:0 0 0 2px #101015}
                    #${MENU_ID} .rsm-slider::-webkit-slider-thumb:hover{background:#d4232f}
                    #${MENU_ID} .rsm-slider::-moz-range-thumb{width:14px;height:14px;background:#c11f2b;border-radius:50%;cursor:pointer;border:none;box-shadow:0 0 0 2px #101015}
                    #${MENU_ID} .rsm-slider-ticks{display:flex;justify-content:space-between;margin-top:6px;font-size:9px;color:#606080;font-weight:600}
                    #${MENU_ID} .rsm-toggle-row{display:flex;align-items:center;justify-content:space-between;gap:8px}
                    #${MENU_ID} .rsm-toggle-label{font-size:12px;color:#e0e0ff;font-weight:600}
                    #${MENU_ID} .rsm-toggle-switch{position:relative;width:32px;height:18px;flex-shrink:0;background:#1e1e28;border-radius:9px;cursor:pointer;transition:background .15s}
                    #${MENU_ID} .rsm-toggle-switch.on{background:#c11f2b}
                    #${MENU_ID} .rsm-toggle-switch::after{content:'';position:absolute;top:2px;left:2px;width:14px;height:14px;background:#fff;border-radius:50%;transition:transform .15s;box-shadow:0 1px 3px rgba(0,0,0,.4)}
                    #${MENU_ID} .rsm-toggle-switch.on::after{transform:translateX(14px)}
                    #${MENU_ID} .rsm-search{padding:8px 12px;border-bottom:1px solid #1e1e28;flex-shrink:0}
                    #${MENU_ID} .rsm-search input{width:100%;box-sizing:border-box;background:#09090f;border:1px solid #1e1e28;border-radius:4px;padding:6px 10px;color:#e0e0ff;font-size:13px;outline:none;transition:border-color .15s}
                    #${MENU_ID} .rsm-search input::placeholder{color:#606080}
                    #${MENU_ID} .rsm-search input:focus{border-color:#c11f2b}
                    #${MENU_ID} .rsm-body{flex:1 1 auto;min-height:0;overflow-y:auto;overflow-x:hidden;padding:8px}
                    #${MENU_ID} .rsm-body.hidden{display:none}
                    #${MENU_ID} .rsm-body::-webkit-scrollbar{width:6px}
                    #${MENU_ID} .rsm-body::-webkit-scrollbar-track{background:transparent}
                    #${MENU_ID} .rsm-body::-webkit-scrollbar-thumb{background:#1e1e28;border-radius:3px}
                    #${MENU_ID} .rsm-section-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#606080;padding:4px 2px 6px;margin-top:4px}
                    #${MENU_ID} .rsm-section-label:first-child{margin-top:0}
                    #${MENU_ID} .rsm-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(56px,1fr));gap:4px}
                    #${MENU_ID} .rsm-item{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;padding:6px 2px;background:transparent;border:1px solid transparent;border-radius:4px;cursor:pointer;transition:background .12s,border-color .12s;user-select:none;min-width:0}
                    #${MENU_ID} .rsm-item:hover{background:rgba(193,31,43,.15);border-color:rgba(193,31,43,.6)}
                    #${MENU_ID} .rsm-item img,#${MENU_ID} .rsm-item canvas{width:32px;height:32px;object-fit:contain;pointer-events:none;display:block}
                    #${MENU_ID} .rsm-item-label{font-size:10px;font-weight:600;color:#a0a0cc;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:center;line-height:1.1}
                    #${MENU_ID} .rsm-fav-btn{position:absolute;top:2px;right:2px;width:18px;height:18px;padding:0;display:inline-flex;align-items:center;justify-content:center;background:transparent;border:none;border-radius:3px;cursor:pointer;color:#606080;opacity:0;transition:opacity .12s,color .12s,background .12s;pointer-events:auto;z-index:2}
                    #${MENU_ID} .rsm-item:hover .rsm-fav-btn,#${MENU_ID} .rsm-fav-btn.active{opacity:1}
                    #${MENU_ID} .rsm-fav-btn:hover{background:rgba(255,255,255,.1);color:#f5c518}
                    #${MENU_ID} .rsm-fav-btn.active{color:#f5c518}
                    #${MENU_ID} .rsm-fav-btn svg{width:14px;height:14px;display:block}
                    #${MENU_ID} .rsm-empty{padding:24px 16px;text-align:center;color:#a0a0cc;font-size:13px;font-style:italic}
                    #${MENU_ID} .rsm-ripmore-section{display:flex;flex-direction:column;gap:8px;padding-top:8px;border-top:1px solid #1e1e28;margin-top:4px}
                    #${MENU_ID} .rsm-ripmore-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#606080;padding:4px 2px 2px}
                `;
                (document.head || document.documentElement).appendChild(style);
            }

            function findChatInput() {
                return document.querySelector('div[role="textbox"][data-a-target="chat-input"]') ||
                    document.querySelector('div[data-a-target="chat-input"][contenteditable="true"]') ||
                    document.querySelector('textarea[data-a-target="chat-input"]') ||
                    document.querySelector('[data-a-target="chat-input"]');
            }
            function injectImageViewerStyles() {
                if (document.getElementById('ripper-viewer-styles')) return;
                const style = document.createElement('style');
                style.id = 'ripper-viewer-styles';
                style.textContent = `
        #ripper-viewer-modal {
            display: none;
            position: fixed;
            inset: 0;
            background: rgba(9, 9, 15, 0.96);
            backdrop-filter: blur(8px);
            z-index: 2147483647;
            align-items: center;
            justify-content: center;
            padding: 20px;
            font-family: 'Inter', system-ui, sans-serif;
        }
        #ripper-viewer-modal.open { display: flex; }
        #ripper-viewer-modal .rv-content {
            position: relative;
            width: 100%;
            max-width: 1280px;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        #ripper-viewer-modal .rv-image {
            max-width: 100%;
            max-height: 92vh;
            object-fit: contain;
            border-radius: 8px;
            box-shadow: 0 10px 40px rgba(0,0,0,.6);
            user-select: none;
        }
        #ripper-viewer-modal .rv-close {
            position: absolute;
            top: 25px;
            right: 35px;
            background: none;
            border: none;
            color: rgba(255,255,255,.8);
            font-size: 2.8rem;
            cursor: pointer;
            z-index: 20;
            line-height: 1;
            padding: 5px 12px;
            transition: color .2s;
        }
        #ripper-viewer-modal .rv-close:hover { color: #ff4d4d; }
        #ripper-viewer-modal .rv-nav {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            background: none;
            border: none;
            color: rgba(255,255,255,.75);
            font-size: 4.5rem;
            font-weight: 300;
            cursor: pointer;
            padding: 20px 15px;
            line-height: 1;
            transition: all .2s ease;
            z-index: 10;
            text-shadow: 0 2px 10px rgba(0,0,0,.7);
            display: none;
        }
        #ripper-viewer-modal .rv-nav:hover {
            color: white;
            transform: translateY(-50%) scale(1.15);
        }
        #ripper-viewer-modal .rv-nav.left { left: 10px; }
        #ripper-viewer-modal .rv-nav.right { right: 10px; }
        #ripper-viewer-modal .rv-counter {
            position: absolute;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%);
            color: rgba(255,255,255,.7);
            font-size: 1rem;
            background: rgba(0,0,0,.5);
            padding: 6px 18px;
            border-radius: 30px;
            display: none;
        }
    `;
                (document.head || document.documentElement).appendChild(style);
            }
            function insertIntoChatInput(code) {
                const input = findChatInput();
                if (!input) return;
                input.focus();
                if (input.tagName === 'TEXTAREA' || input.tagName === 'INPUT') {
                    const value = input.value || '';
                    const start = typeof input.selectionStart === 'number' ? input.selectionStart : value.length;
                    const end = typeof input.selectionEnd === 'number' ? input.selectionEnd : value.length;
                    const before = value.slice(0, start);
                    const after = value.slice(end);
                    const prefix = (before.length > 0 && !/\s$/.test(before)) ? ' ' : '';
                    const insert = prefix + code + ' ';
                    const newValue = before + insert + after;
                    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
                    nativeSetter.call(input, newValue);
                    const pos = before.length + insert.length;
                    try { input.setSelectionRange(pos, pos); } catch (e) { }
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                    return;
                }
                if (input.isContentEditable) {
                    let range;
                    const sel = window.getSelection();
                    if (sel && sel.rangeCount > 0 && input.contains(sel.anchorNode)) range = sel.getRangeAt(0);
                    else {
                        range = document.createRange();
                        const leaf = input.querySelector('[data-slate-leaf]') || input;
                        range.selectNodeContents(leaf);
                        range.collapse(false);
                    }
                    let prefix = '';
                    const container = range.startContainer;
                    if (container && container.nodeType === Node.TEXT_NODE) {
                        const beforeText = container.nodeValue.slice(0, range.startOffset);
                        if (beforeText.length > 0 && !/\s$/.test(beforeText)) prefix = ' ';
                    } else if (range.startOffset > 0 && container.childNodes.length > 0) {
                        const prev = container.childNodes[range.startOffset - 1];
                        if (prev && prev.textContent && !/\s$/.test(prev.textContent)) prefix = ' ';
                    }
                    const text = prefix + code + ' ';
                    const textNode = document.createTextNode(text);
                    range.deleteContents();
                    range.insertNode(textNode);
                    range.setStartAfter(textNode);
                    range.collapse(true);
                    sel.removeAllRanges();
                    sel.addRange(range);
                    input.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertText', data: text }));
                    input.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertText', data: text }));
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }

            const STAR_SVG = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
            const STAR_OUTLINE_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';

            function buildMenuItem(code, file, ext) {
                const item = document.createElement('div');
                item.className = 'rsm-item';
                item.title = code;
                item.setAttribute('data-ripper-code', code);

                let media;
                if (ext === 'webm') {
                    media = createPoolCanvas(code, file, MENU_BUFFER, null);
                    media.classList.add(MENU_CANVAS_CLASS);
                } else {
                    media = document.createElement('img');
                    media.src = getSmileBaseUrl() + encodeURIComponent(file);
                    media.loading = 'lazy';
                    media.decoding = 'async';
                    media.alt = code;
                }

                const label = document.createElement('div');
                label.className = 'rsm-item-label';
                label.textContent = code;

                const isFav = favorites.has(code);
                const favBtn = document.createElement('button');
                favBtn.type = 'button';
                favBtn.className = 'rsm-fav-btn' + (isFav ? ' active' : '');
                favBtn.setAttribute('aria-label', isFav ? 'Убрать из избранного' : 'Добавить в избранное');
                favBtn.innerHTML = isFav ? STAR_SVG : STAR_OUTLINE_SVG;

                favBtn.addEventListener('mousedown', (e) => { e.preventDefault(); e.stopPropagation(); }, true);
                favBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleFavorite(code);
                    rebuildMenuItems();
                }, true);

                item.appendChild(media);
                item.appendChild(label);
                item.appendChild(favBtn);

                item.addEventListener('mousedown', (e) => { e.preventDefault(); e.stopPropagation(); }, true);
                item.addEventListener('click', (e) => {
                    if (e.target.closest('.rsm-fav-btn')) return;
                    e.preventDefault();
                    e.stopPropagation();
                    insertIntoChatInput(code);
                }, true);

                return item;
            }

            function toggleFavorite(code) {
                if (favorites.has(code)) favorites.delete(code);
                else favorites.add(code);
                saveFavorites();
            }

            function matchesQuery(code, query) {
                return !query || code.toLowerCase().includes(query.toLowerCase());
            }

            function rebuildMenuItems() {
                const menu = document.getElementById(MENU_ID);
                if (!menu) return;
                const body = menu.querySelector('.rsm-body');
                if (!body) return;
                const savedScroll = body.scrollTop;
                const existingItems = new Map();
                body.querySelectorAll('.rsm-item').forEach(item => existingItems.set(item.getAttribute('data-ripper-code'), item));

                const q = menuSearchQuery.trim();
                const allCodes = Object.keys(SMILE_MAP);
                const favCodes = allCodes.filter(c => favorites.has(c)).filter(c => matchesQuery(c, q));
                const restCodes = allCodes.filter(c => !favorites.has(c)).filter(c => matchesQuery(c, q));

                const frag = document.createDocumentFragment();
                let total = 0;

                function makeGrid(codes) {
                    const grid = document.createElement('div');
                    grid.className = 'rsm-grid';
                    for (const code of codes) {
                        let item = existingItems.get(code);
                        if (item) existingItems.delete(code);
                        else {
                            const entry = SMILE_MAP[code];
                            const ext = entry.file.split('.').pop().toLowerCase();
                            item = buildMenuItem(code, entry.file, ext === 'webm' ? 'webm' : 'webp');
                        }
                        const favBtn = item.querySelector('.rsm-fav-btn');
                        if (favBtn) {
                            const nowFav = favorites.has(code);
                            favBtn.classList.toggle('active', nowFav);
                            favBtn.innerHTML = nowFav ? STAR_SVG : STAR_OUTLINE_SVG;
                            favBtn.setAttribute('aria-label', nowFav ? 'Убрать из избранного' : 'Добавить в избранное');
                        }
                        grid.appendChild(item);
                        total++;
                    }
                    return grid;
                }

                if (favCodes.length > 0) {
                    const lbl = document.createElement('div');
                    lbl.className = 'rsm-section-label';
                    lbl.textContent = 'Избранное';
                    frag.appendChild(lbl);
                    frag.appendChild(makeGrid(favCodes));
                }
                if (restCodes.length > 0) {
                    if (favCodes.length > 0) {
                        const lbl = document.createElement('div');
                        lbl.className = 'rsm-section-label';
                        lbl.textContent = 'Все смайлики';
                        frag.appendChild(lbl);
                    }
                    frag.appendChild(makeGrid(restCodes));
                }
                if (total === 0) {
                    const empty = document.createElement('div');
                    empty.className = 'rsm-empty';
                    empty.textContent = 'Ничего не найдено';
                    frag.appendChild(empty);
                }

                while (body.firstChild) body.removeChild(body.firstChild);
                body.appendChild(frag);
                body.scrollTop = savedScroll;
                requestAnimationFrame(() => { body.scrollTop = savedScroll; });
            }

            function buildMenuBody(query) {
                const body = document.createElement('div');
                body.className = 'rsm-body';
                const q = (query || '').trim();
                const allCodes = Object.keys(SMILE_MAP);
                const favCodes = allCodes.filter(c => favorites.has(c));
                const restCodes = allCodes.filter(c => !favorites.has(c));
                const favFiltered = favCodes.filter(c => matchesQuery(c, q));
                const restFiltered = restCodes.filter(c => matchesQuery(c, q));
                let total = 0;

                function appendGrid(codes) {
                    const grid = document.createElement('div');
                    grid.className = 'rsm-grid';
                    for (const code of codes) {
                        const entry = SMILE_MAP[code];
                        const ext = entry.file.split('.').pop().toLowerCase();
                        grid.appendChild(buildMenuItem(code, entry.file, ext === 'webm' ? 'webm' : 'webp'));
                        total++;
                    }
                    body.appendChild(grid);
                }

                if (favFiltered.length > 0) {
                    const lbl = document.createElement('div');
                    lbl.className = 'rsm-section-label';
                    lbl.textContent = 'Избранное';
                    body.appendChild(lbl);
                    appendGrid(favFiltered);
                }
                if (restFiltered.length > 0) {
                    if (favFiltered.length > 0) {
                        const lbl = document.createElement('div');
                        lbl.className = 'rsm-section-label';
                        lbl.textContent = 'Все смайлики';
                        body.appendChild(lbl);
                    }
                    appendGrid(restFiltered);
                }
                if (total === 0) {
                    const empty = document.createElement('div');
                    empty.className = 'rsm-empty';
                    empty.textContent = 'Ничего не найдено';
                    body.appendChild(empty);
                }
                return body;
            }

            function buildSettingsPanel() {
                const panel = document.createElement('div');
                panel.className = 'rsm-settings';

                const sizeSection = document.createElement('div');
                sizeSection.className = 'rsm-settings-section';

                const sizeLabel = document.createElement('div');
                sizeLabel.className = 'rsm-settings-label';
                sizeLabel.innerHTML = '<span>Размер смайликов</span><span class="rsm-settings-value">' +
                    smileCurrentScale.toFixed(2).replace(/0+$/, '').replace(/\.$/, '') + 'x</span>';

                const sizeWrap = document.createElement('div');
                sizeWrap.className = 'rsm-slider-wrap';

                const slider = document.createElement('input');
                slider.type = 'range';
                slider.className = 'rsm-slider';
                slider.min = '0';
                slider.max = String(SCALE_VALUES.length - 1);
                slider.step = '1';
                const startIdx = SCALE_VALUES.indexOf(smileCurrentScale);
                slider.value = String(startIdx >= 0 ? startIdx : 0);

                const ticks = document.createElement('div');
                ticks.className = 'rsm-slider-ticks';
                ticks.innerHTML = '<span>1x</span><span>2x</span><span>3x</span>';

                const sizeValueEl = sizeLabel.querySelector('.rsm-settings-value');

                slider.addEventListener('input', () => {
                    const idx = parseInt(slider.value, 10) || 0;
                    const v = SCALE_VALUES[idx] || 1;
                    smileCurrentScale = v;
                    saveSmileScale(v);
                    sizeValueEl.textContent = v.toFixed(2).replace(/0+$/, '').replace(/\.$/, '') + 'x';
                    applyEmojiScale();
                });
                slider.addEventListener('mousedown', (e) => e.stopPropagation());
                slider.addEventListener('click', (e) => e.stopPropagation());

                sizeWrap.appendChild(slider);
                sizeWrap.appendChild(ticks);
                sizeSection.appendChild(sizeLabel);
                sizeSection.appendChild(sizeWrap);

                const tooltipSection = document.createElement('div');
                tooltipSection.className = 'rsm-settings-section';

                const tooltipRow = document.createElement('div');
                tooltipRow.className = 'rsm-toggle-row';

                const tooltipLabel = document.createElement('div');
                tooltipLabel.className = 'rsm-toggle-label';
                tooltipLabel.textContent = 'Подсказка при наведении';

                const tooltipSwitch = document.createElement('div');
                tooltipSwitch.className = 'rsm-toggle-switch' + (smileTooltipEnabled ? ' on' : '');

                tooltipSwitch.addEventListener('mousedown', (e) => { e.stopPropagation(); e.preventDefault(); });
                tooltipSwitch.addEventListener('click', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    smileTooltipEnabled = !smileTooltipEnabled;
                    saveSmileTooltip(smileTooltipEnabled);
                    tooltipSwitch.classList.toggle('on', smileTooltipEnabled);
                    if (!smileTooltipEnabled) hideSmileTooltip();
                });

                tooltipRow.appendChild(tooltipLabel);
                tooltipRow.appendChild(tooltipSwitch);
                tooltipSection.appendChild(tooltipRow);

                const ripmSection = document.createElement('div');
                ripmSection.className = 'rsm-settings-section rsm-ripmore-section';

                const ripmTitle = document.createElement('div');
                ripmTitle.className = 'rsm-ripmore-title';
                ripmTitle.textContent = 'RIPMORE';
                ripmSection.appendChild(ripmTitle);

                function makeToggle(labelText, key, onChange) {
                    const row = document.createElement('div');
                    row.className = 'rsm-toggle-row';
                    const label = document.createElement('div');
                    label.className = 'rsm-toggle-label';
                    label.textContent = labelText;
                    const toggle = document.createElement('div');
                    toggle.className = 'rsm-toggle-switch';
                    const s = getSettings();
                    if (s[key] !== false) toggle.classList.add('on');

                    toggle.addEventListener('mousedown', (e) => { e.stopPropagation(); e.preventDefault(); });
                    toggle.addEventListener('click', (e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        const cur = getSettings();
                        const next = cur[key] === false;
                        setSetting(key, next);
                        toggle.classList.toggle('on', next);
                        if (onChange) onChange(next);
                    });

                    row.appendChild(label);
                    row.appendChild(toggle);
                    return row;
                }

                ripmSection.appendChild(makeToggle('Значки R', 'show_rank_badges', (on) => {
                    if (!on) document.querySelectorAll('.ripper-rank-badge').forEach(b => b.remove());
                    else twitchScanAndApply(true);
                }));
                ripmSection.appendChild(makeToggle('Смайлы RIPSITE', 'show_smiles', (on) => {
                    if (on) processAllChat();
                    else document.querySelectorAll('.' + EMOJI_CLASS).forEach(el => {
                        const code = el.getAttribute('aria-label') || el.getAttribute('alt') || el.getAttribute('data-ripper-smile-code') || '';
                        const txt = document.createTextNode(code);
                        if (el.parentNode) el.parentNode.replaceChild(txt, el);
                    });
                }));
                ripmSection.appendChild(makeToggle('Лидерборд', 'twitch_leaderboard', (on) => {
                    if (on) twitchReplaceLeaderboardPanels();
                }));
                ripmSection.appendChild(makeToggle('Отображение картинок', 'twitch_image_codes', (on) => {
                    if (on) processAllImageCodes();
                    else removeAllImageCodePreviews();
                }));
                ripmSection.appendChild(makeToggle('Отображение аудио', 'twitch_audio_codes', (on) => {
                    if (on) {
                        if (window.__RV_processAllAudio) window.__RV_processAllAudio();
                    } else {
                        if (window.__RV_removeAllAudio) window.__RV_removeAllAudio();
                    }
                }));
                const voiceApiWrap = document.createElement('div');
                voiceApiWrap.className = 'rsm-settings-section';
                const voiceApiLbl = document.createElement('div');
                voiceApiLbl.className = 'rsm-settings-label';
                voiceApiLbl.innerHTML = '<span>dbimg API-ключ</span>';

                const EYE_OPEN_SVG = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zm0 12.5a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/></svg>';
                const EYE_CLOSED_SVG = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 7a5 5 0 0 1 5 5c0 .64-.13 1.25-.36 1.81l2.92 2.92A11.85 11.85 0 0 0 23 12c-1.73-4.39-6-7.5-11-7.5-1.32 0-2.58.23-3.75.64l2.16 2.16C10.97 7.11 11.47 7 12 7zM2.71 3.16 1.39 4.47l2.86 2.86C2.62 8.4 1.17 10.07 0 12c1.73 4.39 6 7.5 11 7.5 1.99 0 3.85-.51 5.5-1.4l3.03 3.03 1.31-1.31L2.71 3.16z"/></svg>';

                const voiceApiFieldWrap = document.createElement('div');
                voiceApiFieldWrap.style.cssText = 'position:relative;width:100%;';

                const voiceApiInput = document.createElement('input');
                voiceApiInput.type = 'password';
                voiceApiInput.placeholder = 'dbimg_xxxxxxxx';
                voiceApiInput.style.cssText = 'width:100%;box-sizing:border-box;background:#09090f;border:1px solid #1e1e28;border-radius:4px;padding:6px 32px 6px 10px;color:#e0e0ff;font-size:12px;outline:none;font-family:inherit;';
                try { voiceApiInput.value = (GM_getValue('dbimg_api_key', '') || '').trim(); } catch (e) { }
                voiceApiInput.addEventListener('mousedown', (e) => e.stopPropagation());
                voiceApiInput.addEventListener('click', (e) => e.stopPropagation());

                const voiceApiEye = document.createElement('button');
                voiceApiEye.type = 'button';
                voiceApiEye.setAttribute('aria-label', 'Показать/скрыть ключ');
                voiceApiEye.title = 'Показать/скрыть ключ';
                voiceApiEye.style.cssText = 'position:absolute;right:6px;top:50%;transform:translateY(-50%);width:22px;height:22px;padding:0;background:transparent;border:none;cursor:pointer;color:#a0a0cc;display:inline-flex;align-items:center;justify-content:center;border-radius:3px;transition:color .15s;';
                voiceApiEye.innerHTML = EYE_CLOSED_SVG;
                voiceApiEye.addEventListener('mouseenter', () => { voiceApiEye.style.color = '#e0e0ff'; });
                voiceApiEye.addEventListener('mouseleave', () => { voiceApiEye.style.color = '#a0a0cc'; });
                voiceApiEye.addEventListener('mousedown', (e) => { e.stopPropagation(); e.preventDefault(); });
                voiceApiEye.addEventListener('click', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    const visible = voiceApiInput.type === 'text';
                    voiceApiInput.type = visible ? 'password' : 'text';
                    voiceApiEye.innerHTML = visible ? EYE_CLOSED_SVG : EYE_OPEN_SVG;
                });
                voiceApiFieldWrap.appendChild(voiceApiInput);
                voiceApiFieldWrap.appendChild(voiceApiEye);
                const voiceApiSave = document.createElement('button');
                voiceApiSave.type = 'button';
                voiceApiSave.textContent = 'Сохранить ключ';
                voiceApiSave.style.cssText = 'padding:6px 10px;background:#c11f2b;border:none;border-radius:4px;color:#fff;cursor:pointer;font-size:11px;font-weight:600;font-family:inherit;';
                voiceApiSave.addEventListener('mousedown', (e) => { e.stopPropagation(); e.preventDefault(); });
                voiceApiSave.addEventListener('click', (e) => {
                    e.stopPropagation(); e.preventDefault();
                    try { GM_setValue('dbimg_api_key', String(voiceApiInput.value || '').trim()); } catch (err) { }
                    voiceApiSave.textContent = 'OK';
                    setTimeout(() => { voiceApiSave.textContent = 'Сохранить ключ'; }, 1200);
                });
                voiceApiWrap.appendChild(voiceApiLbl);
                voiceApiWrap.appendChild(voiceApiFieldWrap);
                voiceApiWrap.appendChild(voiceApiSave);
                const voiceGuideToggle = document.createElement('button');
                voiceGuideToggle.type = 'button';
                voiceGuideToggle.textContent = 'Как получить ключ?';
                voiceGuideToggle.style.cssText = 'margin-top:8px;padding:0;background:transparent;border:none;color:#c11f2b;font-size:11px;font-weight:600;cursor:pointer;text-align:left;font-family:inherit;text-decoration:underline;text-underline-offset:2px;transition:color .15s;';
                voiceGuideToggle.addEventListener('mouseenter', () => { voiceGuideToggle.style.color = '#d4232f'; });
                voiceGuideToggle.addEventListener('mouseleave', () => { voiceGuideToggle.style.color = '#c11f2b'; });
                voiceGuideToggle.addEventListener('mousedown', (e) => { e.stopPropagation(); e.preventDefault(); });

                const voiceGuideBox = document.createElement('div');
                voiceGuideBox.style.cssText = 'display:none;margin-top:8px;padding:10px 12px;background:#09090f;border:1px solid #1e1e28;border-radius:6px;font-size:11px;line-height:1.55;color:#a0a0cc;';
                voiceGuideBox.innerHTML = `
                    <div style="color:#e0e0ff;font-weight:700;font-size:11.5px;margin-bottom:8px;">Как получить API-ключ dbimg</div>
                    <ol style="margin:0;padding-left:16px;display:flex;flex-direction:column;gap:6px;">
                        <li>Открой <a href="https://dbimg.app" target="_blank" rel="noopener noreferrer" style="color:#c11f2b;text-decoration:underline;">dbimg.app</a> и войди в аккаунт (если нет — зарегистрируйся).</li>
                        <li>Перейди в <b style="color:#e0e0ff;">профиль</b> → раздел <b style="color:#e0e0ff;">«API Keys»</b> (в профиле а не в разделе сверху).</li>
                        <li>Нажми <b style="color:#e0e0ff;">«Создать ключ»</b> и скопируй его — обычно начинается с <code style="background:#101015;border:1px solid #1e1e28;border-radius:3px;padding:1px 4px;font-size:10.5px;color:#e0e0ff;">dbimg_</code>.</li>
                        <li>Вставь ключ в поле выше и нажми <b style="color:#e0e0ff;">«Сохранить ключ»</b>.</li>
                    </ol>
                    <div style="margin-top:8px;font-size:10.5px;color:#606080;">Ключ хранится только у тебя. Лимиты по словам разработчика 200 в день также 60 в минуту, но можно купить подписку и тогда лимитов не будет кроме как в час 120 запросов</div>
                `;

                voiceGuideToggle.addEventListener('click', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    const open = voiceGuideBox.style.display === 'block';
                    voiceGuideBox.style.display = open ? 'none' : 'block';
                    voiceGuideToggle.textContent = open ? 'Как получить ключ?' : 'Скрыть инструкцию';
                });

                voiceApiWrap.appendChild(voiceGuideToggle);
                voiceApiWrap.appendChild(voiceGuideBox);
                ripmSection.appendChild(voiceApiWrap);
                panel.appendChild(sizeSection);
                panel.appendChild(tooltipSection);
                panel.appendChild(ripmSection);
                return panel;
            }

            function buildMenu() {
                const menu = document.createElement('div');
                menu.id = MENU_ID;

                const header = document.createElement('div');
                header.className = 'rsm-header';

                const headerImg = document.createElement('img');
                headerImg.src = getRipmoreIconUrl();
                headerImg.alt = 'RIPSITE';

                const headerTitle = document.createElement('div');
                headerTitle.className = 'rsm-header-title';
                headerTitle.textContent = 'RIPSITE';

                const settingsBtn = document.createElement('button');
                settingsBtn.type = 'button';
                settingsBtn.className = 'rsm-settings-toggle';
                settingsBtn.setAttribute('aria-label', 'Настройки');
                settingsBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>';

                header.appendChild(headerImg);
                header.appendChild(headerTitle);
                header.appendChild(settingsBtn);
                menu.appendChild(header);

                const settingsPanel = buildSettingsPanel();
                menu.appendChild(settingsPanel);

                const searchWrap = document.createElement('div');
                searchWrap.className = 'rsm-search';
                const searchInput = document.createElement('input');
                searchInput.type = 'text';
                searchInput.placeholder = 'Поиск смайликов...';
                searchInput.setAttribute('data-ripper-search', '1');
                searchWrap.appendChild(searchInput);
                menu.appendChild(searchWrap);

                const body = buildMenuBody('');
                menu.appendChild(body);

                searchInput.addEventListener('input', () => {
                    menuSearchQuery = searchInput.value;
                    const oldBody = menu.querySelector('.rsm-body');
                    const newBody = buildMenuBody(searchInput.value);
                    if (oldBody) oldBody.replaceWith(newBody);
                });
                searchInput.addEventListener('mousedown', (e) => e.stopPropagation());
                searchInput.addEventListener('click', (e) => e.stopPropagation());

                settingsBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    settingsPanelOpen = !settingsPanelOpen;
                    settingsPanel.classList.toggle('open', settingsPanelOpen);
                    settingsBtn.classList.toggle('active', settingsPanelOpen);
                    if (searchWrap) searchWrap.style.display = settingsPanelOpen ? 'none' : '';
                    const bodyEl = menu.querySelector('.rsm-body');
                    if (bodyEl) bodyEl.style.display = settingsPanelOpen ? 'none' : '';
                });

                menu.__settingsPanel = settingsPanel;
                menu.__settingsBtn = settingsBtn;
                menu.__searchWrap = searchWrap;
                menu.__body = body;
                menu.__searchInput = searchInput;

                return menu;
            }

            function resetMenuState(menu) {
                settingsPanelOpen = false;
                menuSearchQuery = '';
                if (!menu) return;
                const sp = menu.__settingsPanel;
                const sb = menu.__settingsBtn;
                const sw = menu.__searchWrap;
                const bd = menu.__body;
                const si = menu.__searchInput;
                if (sp) sp.classList.remove('open');
                if (sb) sb.classList.remove('active');
                if (sw) sw.style.display = '';
                if (bd) bd.classList.remove('hidden');
                if (si) si.value = '';
            }

            function positionMenu(menu, btn) {
                const rect = btn.getBoundingClientRect();
                const menuRect = menu.getBoundingClientRect();
                let left = rect.left - menuRect.width - 8;
                let top = rect.top - menuRect.height + rect.height;
                if (left < 4) left = rect.right + 8;
                if (left + menuRect.width > window.innerWidth - 4) left = window.innerWidth - menuRect.width - 4;
                if (top < 4) top = 4;
                if (top + menuRect.height > window.innerHeight - 4) top = window.innerHeight - menuRect.height - 4;
                menu.style.left = left + 'px';
                menu.style.top = top + 'px';
            }

            function openMenu() {
                const menu = document.getElementById(MENU_ID);
                const btn = document.getElementById(BTN_ID);
                if (!menu || !btn) return;
                resetMenuState(menu);
                menu.style.display = 'flex';
                menu.classList.add('open');
                menuOpen = true;
                requestAnimationFrame(() => {
                    positionMenu(menu, btn);
                    const searchInput = menu.querySelector('input[data-ripper-search]');
                    if (searchInput) searchInput.focus();
                });
                btn.setAttribute('aria-expanded', 'true');
            }

            function closeMenu() {
                const menu = document.getElementById(MENU_ID);
                const btn = document.getElementById(BTN_ID);
                if (!menu) return;
                resetMenuState(menu);
                menu.style.display = 'none';
                menu.classList.remove('open');
                menuOpen = false;
                if (btn) btn.setAttribute('aria-expanded', 'false');
            }

            function toggleMenu() { menuOpen ? closeMenu() : openMenu(); }

            function ensureButton() {
                if (!isRipperChannel) return;
                const emoteBtn = document.querySelector('button[data-a-target="emote-picker-button"]');
                if (!emoteBtn) return;
                const container = emoteBtn.parentElement;
                if (!container) return;
                if (document.getElementById(ROOT_ID)) {
                    if (!document.getElementById(MENU_ID)) document.body.appendChild(buildMenu());
                    return;
                }
                const root = document.createElement('div');
                root.id = ROOT_ID;
                root.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;vertical-align:middle;height:32px;width:32px;margin:0 2px;flex-shrink:0;line-height:0;';

                const btn = document.createElement('button');
                btn.id = BTN_ID;
                btn.type = 'button';
                btn.setAttribute('aria-label', 'RIPSITE смайлики');
                btn.setAttribute('aria-expanded', 'false');
                btn.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;padding:0;margin:0;background:transparent;border:none;border-radius:4px;cursor:pointer;line-height:0;vertical-align:middle;flex-shrink:0;';

                const img = document.createElement('img');
                img.src = getRipmoreIconUrl();
                img.alt = 'RIPSITE';
                img.style.cssText = 'width:24px;height:24px;object-fit:cover;border-radius:4px;display:block;pointer-events:none;vertical-align:middle;';
                btn.appendChild(img);

                btn.addEventListener('mouseenter', () => { btn.style.background = 'rgba(255,255,255,.1)'; });
                btn.addEventListener('mouseleave', () => { btn.style.background = 'transparent'; });
                btn.addEventListener('mousedown', (e) => { e.preventDefault(); e.stopPropagation(); }, true);
                btn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); toggleMenu(); }, true);

                root.appendChild(btn);
                container.insertBefore(root, emoteBtn);

                if (!document.getElementById(MENU_ID)) document.body.appendChild(buildMenu());

                if (!window.__ripperSmileOutsideHandler) {
                    window.__ripperSmileOutsideHandler = true;
                    document.addEventListener('mousedown', (e) => {
                        if (!menuOpen) return;
                        const menu = document.getElementById(MENU_ID);
                        const btnEl = document.getElementById(BTN_ID);
                        if (!menu) return;
                        if (menu.contains(e.target)) return;
                        if (btnEl && btnEl.contains(e.target)) return;
                        closeMenu();
                    }, true);
                    document.addEventListener('keydown', (e) => {
                        if (e.key === 'Escape' && menuOpen) closeMenu();
                    }, true);
                    window.addEventListener('resize', () => {
                        if (menuOpen) {
                            const menu = document.getElementById(MENU_ID);
                            const btnEl = document.getElementById(BTN_ID);
                            if (menu && btnEl) positionMenu(menu, btnEl);
                        }
                    });
                }
            }

            const IMAGE_CODE_REGEX = /<([a-zA-Z0-9]{5,32})>/g;
            const FIXED_IMG_HEIGHT = 120;

            function findScrollParent(el) {
                let p = el.parentElement;
                while (p && p !== document.body) {
                    const s = getComputedStyle(p);
                    if ((s.overflowY === 'auto' || s.overflowY === 'scroll') && p.scrollHeight > p.clientHeight) {
                        return p;
                    }
                    p = p.parentElement;
                }
                return null;
            }

            function tryResolveOnce(code, callback) {
                const candidates = ['png', 'jpg', 'jpeg', 'webp', 'gif'];
                let resolved = false;
                let remaining = candidates.length;

                for (const ext of candidates) {
                    GM_xmlhttpRequest({
                        method: 'GET',
                        url: IMAGE_BASE + code + '.' + ext,
                        headers: { 'Range': 'bytes=0-0' },
                        onload: function (resp) {
                            if (resolved) return;
                            const ok = (resp.status === 200 || resp.status === 206);
                            if (ok) {
                                resolved = true;
                                cacheSet(code, ext);
                                callback(ext);
                            } else {
                                remaining--;
                                if (remaining === 0 && !resolved) {
                                    resolved = true;
                                    callback(null);
                                }
                            }
                        },
                        onerror: function () {
                            if (resolved) return;
                            remaining--;
                            if (remaining === 0 && !resolved) {
                                resolved = true;
                                callback(null);
                            }
                        }
                    });
                }
            }

            const pendingCodes = new Map();

            function resolveExt(code, callback) {
                if (extCache.has(code)) {
                    callback(extCache.get(code));
                    return;
                }
                if (!pendingCodes.has(code)) {
                    pendingCodes.set(code, new Set());
                    attemptResolve(code, 0);
                }
                pendingCodes.get(code).add(callback);
            }

            function attemptResolve(code, attempt) {
                tryResolveOnce(code, (ext) => {
                    const callbacks = pendingCodes.get(code);
                    if (!callbacks) return;

                    if (ext) {
                        pendingCodes.delete(code);
                        callbacks.forEach(cb => { try { cb(ext); } catch (e) { } });
                        return;
                    }

                    const MAX_ATTEMPTS = 6;
                    if (attempt < MAX_ATTEMPTS) {
                        const delay = Math.min(500 * (attempt + 1), 4000);
                        setTimeout(() => {
                            if (extCache.has(code)) {
                                pendingCodes.delete(code);
                                callbacks.forEach(cb => { try { cb(extCache.get(code)); } catch (e) { } });
                                return;
                            }
                            attemptResolve(code, attempt + 1);
                        }, delay);
                    } else {
                        pendingCodes.delete(code);
                        callbacks.forEach(cb => { try { cb(null); } catch (e) { } });
                    }
                });
            }
            function processImageMessage(messageElement) {
                if (!messageElement) return;
                if (messageElement.closest('[data-a-target="chat-input"]')) return;
                if (messageElement.querySelector('.ripper-img-processed')) return;

                const walker = document.createTreeWalker(
                    messageElement,
                    NodeFilter.SHOW_TEXT,
                    {
                        acceptNode(node) {
                            const p = node.parentElement;
                            if (!p) return NodeFilter.FILTER_REJECT;
                            if (p.closest('.ripper-img-processed')) return NodeFilter.FILTER_REJECT;
                            if (p.closest('.ripper-voice-player')) return NodeFilter.FILTER_REJECT;
                            if (p.closest('[data-a-target="chat-input"]')) return NodeFilter.FILTER_REJECT;
                            if (!node.nodeValue) return NodeFilter.FILTER_REJECT;
                            IMAGE_CODE_REGEX.lastIndex = 0;
                            const ok = IMAGE_CODE_REGEX.test(node.nodeValue);
                            IMAGE_CODE_REGEX.lastIndex = 0;
                            return ok ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
                        }
                    }
                );

                const textNodes = [];
                let n;
                while ((n = walker.nextNode())) textNodes.push(n);
                if (!textNodes.length) return;

                let firstCode = null;
                let firstWrapper = null;

                for (const textNode of textNodes) {
                    const parent = textNode.parentElement;
                    if (!parent || !parent.isConnected) continue;

                    const text = textNode.nodeValue;
                    const fragment = document.createDocumentFragment();
                    let lastIndex = 0;
                    let hasReplacement = false;
                    let match;

                    IMAGE_CODE_REGEX.lastIndex = 0;
                    while ((match = IMAGE_CODE_REGEX.exec(text)) !== null) {
                        const code = match[1];

                        if (match.index > lastIndex) {
                            fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
                        }

                        if (!firstCode) {
                            firstCode = code;
                            const wrapper = document.createElement('span');
                            wrapper.className = 'ripper-img-processed';
                            wrapper.dataset.ripperImgCode = code;
                            wrapper.style.cssText =
                                'display:block;width:fit-content;margin:4px 0;line-height:0;max-width:100%;';

                            const img = document.createElement('img');
                            img.style.cssText =
                                'height:' + FIXED_IMG_HEIGHT + 'px;width:auto;max-width:100%;object-fit:contain;' +
                                'border-radius:4px;cursor:pointer;display:inline-block;vertical-align:middle;';
                            wrapper.appendChild(img);
                            fragment.appendChild(wrapper);
                            firstWrapper = wrapper;
                        }

                        lastIndex = match.index + match[0].length;
                        hasReplacement = true;
                    }

                    if (hasReplacement) {
                        if (lastIndex < text.length) {
                            fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
                        }
                        parent.replaceChild(fragment, textNode);
                    }
                }

                if (!firstCode) return;

                resolveExt(firstCode, (ext) => {
                    if (!firstWrapper) return;

                    if (!firstWrapper.isConnected) return;
                    if (!ext) {

                        const txt = document.createTextNode('<' + firstCode + '>');
                        if (firstWrapper.parentNode) firstWrapper.parentNode.replaceChild(txt, firstWrapper);
                        return;
                    }
                    const url = IMAGE_BASE + firstCode + '.' + ext;
                    const img = firstWrapper.querySelector('img');
                    if (img) {
                        img.src = url;
                        img.addEventListener('click', (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (window.__RV_openImageViewer) {
                                window.__RV_openImageViewer([url], 0);
                            } else {
                                window.open(url, '_blank', 'noopener');
                            }
                        });
                    }
                });
            }
            (function initRipperImageViewer() {
                let viewerImages = [];
                let viewerIndex = 0;
                let viewerModal = null;
                let viewerImgEl = null;
                let viewerCounterEl = null;
                let viewerLeftBtn = null;
                let viewerRightBtn = null;

                function ensureViewer() {
                    if (viewerModal && document.body.contains(viewerModal)) return;
                    injectImageViewerStyles();

                    viewerModal = document.createElement('div');
                    viewerModal.id = 'ripper-viewer-modal';
                    viewerModal.innerHTML = `
            <div class="rv-content">
                <button class="rv-close" aria-label="Закрыть">×</button>
                <button class="rv-nav left" aria-label="Назад">‹</button>
                <img class="rv-image" src="" alt="">
                <button class="rv-nav right" aria-label="Вперёд">›</button>
                <div class="rv-counter"></div>
            </div>
        `;
                    document.body.appendChild(viewerModal);

                    viewerImgEl = viewerModal.querySelector('.rv-image');
                    viewerCounterEl = viewerModal.querySelector('.rv-counter');
                    viewerLeftBtn = viewerModal.querySelector('.rv-nav.left');
                    viewerRightBtn = viewerModal.querySelector('.rv-nav.right');

                    viewerModal.querySelector('.rv-close').addEventListener('click', closeViewer);
                    viewerLeftBtn.addEventListener('click', prevViewerImage);
                    viewerRightBtn.addEventListener('click', nextViewerImage);

                    viewerModal.addEventListener('click', (e) => {
                        if (e.target === viewerModal) closeViewer();
                    });

                    document.addEventListener('keydown', onViewerKey, true);
                }

                function onViewerKey(e) {
                    if (!viewerModal || !viewerModal.classList.contains('open')) return;
                    if (e.key === 'Escape') { e.preventDefault(); closeViewer(); }
                    if (e.key === 'ArrowRight') { e.preventDefault(); nextViewerImage(); }
                    if (e.key === 'ArrowLeft') { e.preventDefault(); prevViewerImage(); }
                }

                function updateViewer() {
                    if (!viewerImages.length) return;
                    viewerImgEl.src = viewerImages[viewerIndex];
                    const multiple = viewerImages.length > 1;
                    viewerLeftBtn.style.display = multiple ? 'block' : 'none';
                    viewerRightBtn.style.display = multiple ? 'block' : 'none';
                    viewerCounterEl.style.display = multiple ? 'block' : 'none';
                    if (multiple) {
                        viewerCounterEl.textContent = `${viewerIndex + 1} / ${viewerImages.length}`;
                    }
                }

                function openViewer(urls, startIndex) {
                    ensureViewer();
                    viewerImages = Array.isArray(urls) ? urls.filter(Boolean) : [urls];
                    viewerIndex = Math.max(0, Math.min(startIndex || 0, viewerImages.length - 1));
                    updateViewer();
                    viewerModal.classList.add('open');
                    viewerModal.style.display = 'flex';
                }

                function closeViewer() {
                    if (!viewerModal) return;
                    viewerModal.classList.remove('open');
                    viewerModal.style.display = 'none';
                    viewerImgEl.src = '';
                }

                function nextViewerImage() {
                    if (viewerImages.length < 2) return;
                    viewerIndex = (viewerIndex + 1) % viewerImages.length;
                    updateViewer();
                }

                function prevViewerImage() {
                    if (viewerImages.length < 2) return;
                    viewerIndex = (viewerIndex - 1 + viewerImages.length) % viewerImages.length;
                    updateViewer();
                }


                window.__RV_openImageViewer = openViewer;
            })();
            function removeAllImageCodePreviews() {
                document.querySelectorAll('.ripper-img-processed').forEach(el => {
                    const code = el.dataset.ripperImgCode;
                    if (code) {
                        const txt = document.createTextNode('<' + code + '>');
                        if (el.parentNode) el.parentNode.replaceChild(txt, el);
                    } else {
                        el.remove();
                    }
                });
            }

            function startImageCodeObserver() {
                if (window.__ripperImageCodeObserver) return;
                window.__ripperImageCodeObserver = true;
                const observer = new MutationObserver((mutations) => {
                    if (!isRipperChannel) return;
                    if (!isEnabled('twitch_image_codes')) return;
                    for (const mutation of mutations) {
                        if (mutation.type === 'characterData') {
                            const parent = mutation.target.parentElement;
                            if (parent) {
                                const msg = parent.closest('.chat-line__message');
                                if (msg) processImageMessage(msg);
                            }
                            continue;
                        }
                        for (const addedNode of mutation.addedNodes) {
                            if (addedNode.nodeType !== 1) continue;
                            if (addedNode.classList && addedNode.classList.contains('chat-line__message')) {
                                processImageMessage(addedNode);
                            } else if (addedNode.querySelectorAll) {
                                addedNode.querySelectorAll('.chat-line__message').forEach(processImageMessage);
                            }
                        }
                    }
                });
                observer.observe(document.body, { childList: true, subtree: true, characterData: true });
            }

            function processAllChat() {
                if (!isRipperChannel) return;
                if (!isSmilesEnabled()) return;
                document.querySelectorAll('.chat-line__message').forEach(processSubtree);
            }

            function twitchGetColorByPosition(pos) {
                if (pos === 1) return THEME.gold;
                if (pos === 2) return THEME.silver;
                if (pos === 3) return THEME.bronze;
                return THEME.red;
            }

            function twitchBuildRankMap() {
                const map = new Map();
                const userMedalCount = new Map();
                for (const key of Object.keys(MEDALS_MAP)) {
                    const users = MEDALS_MAP[key] && Array.isArray(MEDALS_MAP[key].users) ? MEDALS_MAP[key].users : [];
                    for (const u of users) {
                        const lname = String(u).toLowerCase();
                        userMedalCount.set(lname, (userMedalCount.get(lname) || 0) + 1);
                    }
                }
                const sorted = [...userMedalCount.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
                sorted.forEach(([username, count], idx) => {
                    const pos = idx + 1;
                    map.set(username, { medals: count, color: twitchGetColorByPosition(pos), position: pos });
                });
                return map;
            }

            function twitchInjectStyles() {
                if (document.getElementById('ripper-twitch-styles')) return;
                const style = document.createElement('style');
                style.id = 'ripper-twitch-styles';
                style.textContent = `
                    .ripper-rank-badge{display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;min-width:18px;margin-right:5px;border-radius:4px;background:${THEME.bg};color:#fff;font-family:${FONT};font-weight:800;font-size:12px;line-height:1;vertical-align:middle;position:relative;cursor:pointer;user-select:none;box-shadow:inset 0 0 0 1.5px currentColor;z-index:1}
                    .ripper-rank-tooltip{position:fixed;z-index:2147483647;background:${THEME.bg};color:${THEME.text};font-family:${FONT};font-size:12px;font-weight:600;line-height:1.3;padding:6px 10px;border-radius:8px;box-shadow:0 6px 24px rgba(0,0,0,.7);pointer-events:none;white-space:nowrap;opacity:0;transition:opacity .12s}
                    .ripper-rank-tooltip.visible{opacity:1}
                    .ripper-rank-tooltip .rr-medals{color:${THEME.red};font-weight:800}
                    .ripper-leaderboard{font-family:${FONT};background:${THEME.bg};color:${THEME.text};display:flex;flex-direction:column;height:100%;width:100%;box-sizing:border-box;overflow:hidden}
                    .ripper-leaderboard *{box-sizing:border-box}
                    .ripper-leaderboard-header{padding:14px 16px 10px;border-bottom:1px solid ${THEME.border};display:flex;flex-direction:column;gap:8px;flex-shrink:0}
                    .ripper-leaderboard-title-row{display:flex;align-items:center;gap:8px}
                    .ripper-leaderboard-title{font-family:${FONT_TITLE};font-weight:700;font-size:15px;letter-spacing:.5px;color:${THEME.text};display:flex;align-items:center;gap:8px;flex:1}
                    .ripper-leaderboard-title .rl-accent{display:inline-block;width:4px;height:16px;background:${THEME.red};border-radius:2px}
                    .ripper-leaderboard-list{flex:1;overflow-y:auto;padding:8px 8px 12px;display:flex;flex-direction:column;gap:${ROW_GAP_PX}px;scrollbar-width:thin;scrollbar-color:${THEME.border} transparent}
                    .ripper-leaderboard-list::-webkit-scrollbar{width:6px}
                    .ripper-leaderboard-list::-webkit-scrollbar-thumb{background:${THEME.border};border-radius:3px}
                    .ripper-leaderboard-list::-webkit-scrollbar-track{background:transparent}
                    .ripper-leaderboard-row{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:6px;background:${THEME.card};flex-shrink:0;cursor:pointer;transition:background .12s}
                    .ripper-leaderboard-row:hover{background:#1f1f23}
                    .ripper-leaderboard-place{width:22px;flex-shrink:0;font-family:${FONT_TITLE};font-weight:800;font-size:12px;text-align:center;color:${THEME.textMuted}}
                    .ripper-leaderboard-place.top1{color:${THEME.gold}}
                    .ripper-leaderboard-place.top2{color:${THEME.silver}}
                    .ripper-leaderboard-place.top3{color:${THEME.bronze}}
                    .ripper-leaderboard-badge{display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;min-width:18px;border-radius:4px;background:${THEME.bg};font-family:${FONT};font-weight:800;font-size:12px;line-height:1;flex-shrink:0;box-shadow:inset 0 0 0 1.5px currentColor;position:relative;cursor:pointer;user-select:none}
                    .ripper-leaderboard-name{flex:1;min-width:0;font-size:13px;font-weight:600;color:${THEME.text};white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
                    .ripper-leaderboard-medals-count{font-size:12px;font-weight:700;color:${THEME.textMuted};flex-shrink:0;font-variant-numeric:tabular-nums}
                    .ripper-leaderboard-medals-count span{color:${THEME.text}}
                    .ripper-leaderboard-total{font-size:11.5px;font-weight:600;color:${THEME.textMuted};padding:6px 16px 0;flex-shrink:0}
                    .ripper-leaderboard-total span{color:${THEME.text};font-weight:700}
                    .ripper-leaderboard-empty{padding:30px 16px;text-align:center;color:${THEME.textMuted};font-size:12px;font-style:italic}
                `;
                (document.head || document.documentElement).appendChild(style);
            }

            let twitchTooltipEl = null;

            function twitchEnsureTooltip() {
                if (!twitchTooltipEl) {
                    twitchTooltipEl = document.createElement('div');
                    twitchTooltipEl.className = 'ripper-rank-tooltip';
                    document.body.appendChild(twitchTooltipEl);
                }
                return twitchTooltipEl;
            }

            function twitchPositionTooltip(target) {
                const rect = target.getBoundingClientRect();
                const tipRect = twitchTooltipEl.getBoundingClientRect();
                let left = rect.left + rect.width / 2 - tipRect.width / 2;
                let top = rect.top - tipRect.height - 8;
                if (top < 4) top = rect.bottom + 8;
                if (left < 4) left = 4;
                if (left + tipRect.width > window.innerWidth - 4) left = window.innerWidth - tipRect.width - 4;
                twitchTooltipEl.style.left = left + 'px';
                twitchTooltipEl.style.top = top + 'px';
            }

            function twitchShowTooltip(badge, html) {
                twitchEnsureTooltip();
                twitchTooltipEl.innerHTML = html;
                twitchTooltipEl.classList.add('visible');
                twitchPositionTooltip(badge);
            }

            function twitchHideTooltip() {
                if (twitchTooltipEl) twitchTooltipEl.classList.remove('visible');
            }
            const TWITCH_HIDDEN_USERS = new Set(['ripper_cmertanoc']);

            function isHiddenTwitchUser(username) {
                return !!username && TWITCH_HIDDEN_USERS.has(String(username).toLowerCase());
            }
            function twitchMakeBadge(color, medals, username) {
                if (isHiddenTwitchUser(username)) return null;
                const b = document.createElement('span');
                b.className = 'ripper-rank-badge';
                b.style.color = color;
                b.dataset.color = color;
                b.textContent = 'R';
                b.dataset.ripperUser = username || '';
                b.dataset.medals = String(medals);
                b.addEventListener('mouseenter', () => {
                    const count = getUserMedals(username).length;
                    const text = count === 0 ? 'Нет достижений' : `Достижений: <span class="rr-medals">${count}</span>`;
                    twitchShowTooltip(b, text);
                });
                b.addEventListener('mouseleave', twitchHideTooltip);
                b.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    openMedals(username, b);
                });
                if (username) attachMiniMedalToBadge(b, username);
                return b;
            }

            function twitchEnsureBadgeBeforeUsername(usernameEl, rankMap) {
                if (!usernameEl) return;
                const username = (usernameEl.getAttribute('data-a-user') || usernameEl.textContent || '').trim().toLowerCase();
                if (!username) return;

                const parent = usernameEl.parentElement;
                if (!parent) return;

                if (isHiddenTwitchUser(username)) {
                    const existingBadge = parent.querySelector('.ripper-rank-badge');
                    if (existingBadge) existingBadge.remove();
                    return;
                }

                const existing = parent.querySelector('.ripper-rank-badge');
                const info = rankMap.get(username);
                if (!isRankBadgesEnabled()) { if (existing) existing.remove(); return; }
                if (!info) {
                    if (existing) {
                        if (existing.dataset.medals === '0' && existing.dataset.color === THEME.gray) {
                            attachMiniMedalToBadge(existing, username);
                            return;
                        }
                        existing.remove();
                    }
                    const grayBadge = twitchMakeBadge(THEME.gray, 0, username);
                    if (grayBadge) parent.insertBefore(grayBadge, parent.firstChild);
                    return;
                }
                if (existing) {
                    if (existing.dataset.medals !== String(info.medals) || existing.dataset.color !== info.color) existing.remove();
                    else { attachMiniMedalToBadge(existing, username); return; }
                }
                const badge = twitchMakeBadge(info.color, info.medals, username);
                if (badge) {
                    badge.dataset.medals = String(info.medals);
                    parent.insertBefore(badge, parent.firstChild);
                }
            }

            function twitchProcessChatLine(line) {
                if (!line) return;
                line.querySelectorAll('span.chat-author__display-name[data-a-user]').forEach(el => {
                    if (TWITCH_RANK_MAP) twitchEnsureBadgeBeforeUsername(el, TWITCH_RANK_MAP);
                });
            }

            function twitchGetPlaceClass(pos) {
                if (pos === 1) return 'top1';
                if (pos === 2) return 'top2';
                if (pos === 3) return 'top3';
                return '';
            }

            function twitchGetLeaderboardRows() {
                const map = new Map();
                for (const key of Object.keys(MEDALS_MAP)) {
                    const users = MEDALS_MAP[key] && Array.isArray(MEDALS_MAP[key].users) ? MEDALS_MAP[key].users : [];
                    for (const u of users) {
                        const lname = String(u).toLowerCase();
                        if (!map.has(lname)) map.set(lname, { username: lname, displayUsername: String(u) });
                    }
                }
                const rows = [...map.values()];
                rows.forEach(row => { row.medalsCount = getUserMedals(row.username).length; });
                rows.sort((a, b) => b.medalsCount - a.medalsCount || a.username.localeCompare(b.username));
                rows.forEach((row, idx) => { row.color = twitchGetColorByPosition(idx + 1); });
                return rows;
            }

            function twitchBuildLeaderboard() {
                const wrapper = document.createElement('div');
                wrapper.className = 'ripper-leaderboard';
                const rows = twitchGetLeaderboardRows();
                const totalUsers = getTotalUniqueUsers();

                const header = document.createElement('div');
                header.className = 'ripper-leaderboard-header';

                const titleRow = document.createElement('div');
                titleRow.className = 'ripper-leaderboard-title-row';

                const title = document.createElement('div');
                title.className = 'ripper-leaderboard-title';
                title.innerHTML = '<span class="rl-accent"></span>Топ по достижениям';

                titleRow.appendChild(title);
                header.appendChild(titleRow);

                const totalRow = document.createElement('div');
                totalRow.className = 'ripper-leaderboard-total';
                totalRow.innerHTML = `Людей в базе: <span>${totalUsers}</span>`;
                header.appendChild(totalRow);
                wrapper.appendChild(header);

                const list = document.createElement('div');
                list.className = 'ripper-leaderboard-list';
                list.style.maxHeight = (MAX_VISIBLE_ROWS * ROW_HEIGHT_PX + (MAX_VISIBLE_ROWS - 1) * ROW_GAP_PX + LIST_PADDING_PX * 2) + 'px';

                if (rows.length === 0) {
                    const empty = document.createElement('div');
                    empty.className = 'ripper-leaderboard-empty';
                    empty.textContent = 'Нет данных';
                    list.appendChild(empty);
                } else {
                    rows.forEach((entry, idx) => {
                        const pos = idx + 1;
                        const color = entry.color || twitchGetColorByPosition(pos);
                        const row = document.createElement('div');
                        row.className = 'ripper-leaderboard-row';
                        row.style.height = ROW_HEIGHT_PX + 'px';
                        row.setAttribute('data-ripper-username', entry.username);

                        const place = document.createElement('div');
                        place.className = 'ripper-leaderboard-place ' + twitchGetPlaceClass(pos);
                        place.textContent = pos;

                        const badge = document.createElement('span');
                        badge.className = 'ripper-leaderboard-badge';
                        badge.style.color = color;
                        badge.textContent = 'R';

                        const name = document.createElement('div');
                        name.className = 'ripper-leaderboard-name';
                        name.textContent = entry.displayUsername || entry.username;

                        const tail = document.createElement('div');
                        tail.className = 'ripper-leaderboard-medals-count';
                        tail.innerHTML = `<span>${entry.medalsCount}</span> достиж.`;

                        row.appendChild(place);
                        row.appendChild(badge);
                        row.appendChild(name);
                        row.appendChild(tail);
                        row.addEventListener('click', (e) => {
                            e.preventDefault(); e.stopPropagation();
                            openMedals(entry.username, row);
                        }, true);
                        list.appendChild(row);
                    });
                }

                wrapper.appendChild(list);
                return wrapper;
            }

            function twitchIsLeaderboardPanel(panel) {
                if (!panel) return false;
                if (panel.querySelector('.ripper-leaderboard')) return true;
                const link = panel.querySelector('a.tw-link[href*="extension_panel"]');
                if (!link) return false;
                const text = (link.textContent || '').toLowerCase();
                const href = (link.getAttribute('href') || '').toLowerCase();
                return text.includes('leaderboard') || text.includes('streamelements') || href.includes('leaderboard') || href.includes('streamelements');
            }

            function twitchHidePanelChrome(panel) {
                if (!panel || !twitchIsLeaderboardPanel(panel)) return;
                panel.querySelectorAll('a.tw-link[href*="extension_panel"]').forEach(a => {
                    (a.closest('.Layout-sc-1xcs6mc-0') || a).style.display = 'none';
                });
                panel.querySelectorAll('[data-test-selector="popout_button_selector"]').forEach(btn => {
                    const wrap = btn.closest('.InjectLayout-sc-1i43xsx-0') || btn.closest('span') || btn;
                    if (wrap) wrap.style.display = 'none';
                });
                panel.querySelectorAll('button[aria-label="Подробнее"]').forEach(btn => {
                    (btn.closest('.InjectLayout-sc-1i43xsx-0') || btn.closest('span') || btn).remove();
                });
                panel.querySelectorAll('.foyuou').forEach(el => el.remove());
                panel.querySelectorAll('.extension-panel iframe,.extension-panel-extension-frame').forEach(iframe => { iframe.style.display = 'none'; });
            }

            function twitchReplaceLeaderboardPanels() {
                if (!isEnabled('twitch_leaderboard')) return;
                if (!isRipperChannel) return;
                if (!MEDALS_MAP || Object.keys(MEDALS_MAP).length === 0) return;
                document.querySelectorAll('.extension-panel').forEach(panel => {
                    if (!twitchIsLeaderboardPanel(panel)) return;
                    const iframeContainer = panel.querySelector('[data-test-selector="iframe_container_selector"]');
                    if (!iframeContainer) return;
                    if (iframeContainer.querySelector('.ripper-leaderboard')) { twitchHidePanelChrome(panel); return; }
                    while (iframeContainer.firstChild) iframeContainer.removeChild(iframeContainer.firstChild);
                    iframeContainer.appendChild(twitchBuildLeaderboard());
                    iframeContainer.style.height = '';
                    iframeContainer.style.overflow = 'hidden';
                    twitchHidePanelChrome(panel);
                });
            }

            function twitchScanAndApply() {
                if (!isRipperChannel) return;
                if (!isRankBadgesEnabled()) return;
                document.querySelectorAll('.chat-line__message').forEach(line => {
                    twitchProcessChatLine(line);
                });
                processAllViewerCards();
            }

            function getUserCardUsername(card) {
                if (!card) return '';
                const link = card.querySelector('.viewer-card-header__display-name a.tw-link[href^="/"]');
                if (link) return (link.getAttribute('href') || '').replace(/^\//, '').split(/[/?#]/)[0].toLowerCase();
                const anyLink = card.querySelector('a.tw-link[href^="/"]');
                if (anyLink) return (anyLink.getAttribute('href') || '').replace(/^\//, '').split(/[/?#]/)[0].toLowerCase();
                return '';
            }

            function attachBadgesToViewerCard(card) {
                if (!card) return;
                const username = getUserCardUsername(card);
                if (!username) return;
                const header = card.querySelector('.viewer-card-header__display-name');
                if (!header) return;
                const displayNameEl = header.querySelector('.EbCAH h4') || header.querySelector('h4') || header.querySelector('.EbCAH') || header;
                if (!displayNameEl) return;
                displayNameEl.style.position = 'relative';

                let badge = displayNameEl.querySelector('.ripper-rank-badge');
                const info = TWITCH_RANK_MAP ? TWITCH_RANK_MAP.get(username) : null;

                if (!isRankBadgesEnabled()) { if (badge) badge.remove(); return; }

                if (info) {
                    if (badge) {
                        if (badge.dataset.medals !== String(info.medals) || badge.dataset.color !== info.color) { badge.remove(); badge = null; }
                    }
                    if (!badge) {
                        badge = twitchMakeBadge(info.color, info.medals, username);
                        displayNameEl.insertBefore(badge, displayNameEl.firstChild);
                    } else attachMiniMedalToBadge(badge, username);
                } else {
                    if (badge) {
                        if (badge.dataset.medals !== '0' || badge.dataset.color !== THEME.gray) { badge.remove(); badge = null; }
                    }
                    if (!badge) {
                        badge = twitchMakeBadge(THEME.gray, 0, username);
                        displayNameEl.insertBefore(badge, displayNameEl.firstChild);
                    }
                }
            }

            function processAllViewerCards() {
                document.querySelectorAll('.viewer-card').forEach(attachBadgesToViewerCard);
            }

            function attachMiniMedalToBadge(badge, username) {
                if (!badge) return;
                const medals = getUserMedals(username);
                const existing = badge.querySelector('.ripper-medal-mini');
                if (medals.length === 0) { if (existing) existing.remove(); return; }
                if (existing) {
                    const inner = existing.querySelector('span');
                    const txt = String(medals.length);
                    if (inner) { if (inner.textContent !== txt) inner.textContent = txt; }
                    else existing.textContent = txt;
                    existing.style.color = badge.style.color;
                    existing.style.background = badge.style.color;
                    return;
                }
                const mini = document.createElement('span');
                mini.className = 'ripper-medal-mini';
                mini.style.color = badge.style.color;
                mini.style.background = badge.style.color;
                const inner = document.createElement('span');
                inner.textContent = String(medals.length);
                mini.appendChild(inner);
                badge.appendChild(mini);
            }

            function injectMedalStyles() {
                if (document.getElementById('ripper-medal-styles')) return;
                const style = document.createElement('style');
                style.id = 'ripper-medal-styles';
                style.textContent = `
                    .ripper-medal-mini{position:absolute;top:-3px;right:-3px;display:inline-flex;align-items:center;justify-content:center;width:10px;height:10px;min-width:10px;padding:0;border-radius:5px;background:currentColor;color:inherit;font-family:'Inter',system-ui,sans-serif;font-weight:800;font-size:7px;line-height:1;box-shadow:0 0 0 1px #000,0 1px 3px rgba(0,0,0,.6);pointer-events:none;z-index:3;user-select:none}
                    .ripper-medal-mini>span{color:#000;mix-blend-mode:normal}
                    #ripper-medal-tooltip{position:fixed;z-index:2147483647;background:#101015;border:1px solid #1e1e28;border-radius:10px;padding:18px 20px;box-shadow:0 12px 40px rgba(0,0,0,.8);font-family:'Inter',system-ui,-apple-system,sans-serif;color:#e0e0ff;pointer-events:none;opacity:0;transition:opacity .14s,transform .14s;transform:scale(.95);max-width:380px;display:flex;flex-direction:column;gap:10px}
                    #ripper-medal-tooltip.visible{opacity:1;transform:scale(1)}
                    #ripper-medal-tooltip .rmt-head{display:flex;flex-direction:column;align-items:center;gap:12px}
                    #ripper-medal-tooltip .rmt-head img{width:180px;height:180px;object-fit:contain;flex-shrink:0;filter:drop-shadow(0 6px 18px rgba(0,0,0,.7))}
                    #ripper-medal-tooltip .rmt-head-text{display:flex;flex-direction:column;gap:6px;min-width:0;text-align:center}
                    #ripper-medal-tooltip .rmt-title{font-size:18px;font-weight:800;color:#c11f2b;line-height:1.2}
                    #ripper-medal-tooltip .rmt-desc{font-size:13px;color:#a0a0cc;line-height:1.45}
                    .ripper-medals-popup{position:fixed;z-index:2147483646;width:340px;max-height:70vh;background:#101015;border:1px solid #1e1e28;border-radius:10px;box-shadow:0 16px 48px rgba(0,0,0,.85);display:flex;flex-direction:column;overflow:hidden;font-family:'Inter','Roobert',system-ui,-apple-system,sans-serif;color:#e0e0ff;animation:rmpFade .14s ease-out}
                    @keyframes rmpFade{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}
                    .ripper-medals-popup-header{display:flex;align-items:center;gap:10px;padding:10px 12px;border-bottom:1px solid #1e1e28;background:#09090f;flex-shrink:0}
                    .ripper-medals-popup-header img{width:24px;height:24px;border-radius:4px;object-fit:cover}
                    .ripper-medals-popup-title{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}
                    .ripper-medals-popup-title-main{font-size:13px;font-weight:700;color:#e0e0ff;line-height:1.2}
                    .ripper-medals-popup-title-sub{font-size:11px;color:#a0a0cc;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
                    .ripper-medals-popup-close{width:26px;height:26px;flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;background:transparent;border:none;border-radius:4px;cursor:pointer;color:#a0a0cc;padding:0;transition:background .15s,color .15s}
                    .ripper-medals-popup-close:hover{background:rgba(255,255,255,.1);color:#e0e0ff}
                    .ripper-medals-popup-close svg{width:16px;height:16px;fill:currentColor;display:block}
                    .ripper-medals-popup-search{padding:8px 12px;border-bottom:1px solid #1e1e28;background:#09090f;flex-shrink:0}
                    .ripper-medals-popup-search input{width:100%;box-sizing:border-box;background:#101015;border:1px solid #1e1e28;border-radius:4px;padding:6px 10px;color:#e0e0ff;font-size:12px;outline:none;font-family:inherit;transition:border-color .15s}
                    .ripper-medals-popup-search input::placeholder{color:#606080}
                    .ripper-medals-popup-search input:focus{border-color:#c11f2b}
                    .ripper-medals-popup-body{flex:1;min-height:0;overflow-y:auto;padding:8px;display:flex;flex-direction:column;gap:6px}
                    .ripper-medals-popup-body::-webkit-scrollbar{width:5px}
                    .ripper-medals-popup-body::-webkit-scrollbar-track{background:transparent}
                    .ripper-medals-popup-body::-webkit-scrollbar-thumb{background:#1e1e28;border-radius:3px}
                    .ripper-medals-popup-empty{padding:20px 12px;text-align:center;color:#a0a0cc;font-size:12px;font-style:italic}
                    .ripper-medals-popup-item{display:flex;align-items:center;gap:10px;padding:8px;background:#09090f;border:1px solid #1e1e28;border-radius:6px;cursor:pointer;transition:border-color .12s,background .12s}
                    .ripper-medals-popup-item:hover{border-color:#c11f2b;background:#16161a}
                    .ripper-medals-popup-item.locked{opacity:.45;filter:grayscale(1)}
                    .ripper-medals-popup-item img{width:40px;height:40px;object-fit:contain;flex-shrink:0;filter:drop-shadow(0 2px 6px rgba(0,0,0,.6))}
                    .ripper-medals-popup-item-info{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
                    .ripper-medals-popup-item-title{font-size:13px;font-weight:700;color:#c11f2b;line-height:1.2}
                    .ripper-medals-popup-item.locked .ripper-medals-popup-item-title{color:#a0a0cc}
                    .ripper-medals-popup-item-desc{font-size:11px;color:#a0a0cc;line-height:1.35;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
                    .ripper-medals-popup-item-count{font-size:11px;font-weight:700;color:#a0a0cc;flex-shrink:0;font-variant-numeric:tabular-nums;padding-left:6px;display:flex;flex-direction:column;align-items:flex-end;gap:2px}
                    .ripper-medals-popup-item-count .rmc-people{color:#e0e0ff}
                    .ripper-medals-popup-item-count .rmc-pct{color:#c11f2b;font-size:10px}
                    .ripper-medals-popup-counter{font-size:11.5px;font-weight:600;color:#a0a0cc;padding:6px 12px;border-bottom:1px solid #1e1e28;background:#09090f;flex-shrink:0;display:flex;align-items:center;gap:6px;font-variant-numeric:tabular-nums}
                    .ripper-medals-popup-counter .rmc-value{color:#e0e0ff;font-weight:800}
                    .ripper-medals-popup-counter .rmc-pct{color:#c11f2b;font-weight:800}
                    .ripper-medals-popup-users{position:fixed;z-index:2147483647;width:300px;background:#101015;border:1px solid #1e1e28;border-radius:10px;box-shadow:0 16px 48px rgba(0,0,0,.85);display:flex;flex-direction:column;overflow:hidden;font-family:'Inter','Roobert',system-ui,-apple-system,sans-serif;color:#e0e0ff;animation:rmpFade .14s ease-out}
                    .ripper-medals-popup-users-header{display:flex;align-items:center;gap:10px;padding:10px 12px;border-bottom:1px solid #1e1e28;background:#09090f;flex-shrink:0}
                    .ripper-medals-popup-users-header img{width:28px;height:28px;object-fit:contain;flex-shrink:0;filter:drop-shadow(0 2px 6px rgba(0,0,0,.6))}
                    .ripper-medals-popup-users-title{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}
                    .ripper-medals-popup-users-title-main{font-size:12.5px;font-weight:700;color:#c11f2b;line-height:1.2}
                    .ripper-medals-popup-users-title-sub{font-size:11px;color:#a0a0cc;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
                    .ripper-medals-popup-users-body{padding:10px 12px;font-size:12px;line-height:1.6;color:#e0e0ff;word-break:break-word}
                    .ripper-medals-popup-users-list{display:flex;flex-wrap:wrap;gap:0}
                    .ripper-medals-popup-users-list .rmu-name{color:#e0e0ff;font-weight:600}
                    .ripper-medals-popup-users-list .rmu-sep{color:#a0a0cc;margin-right:6px}
                    .ripper-medals-popup-users-empty{padding:16px 12px;text-align:center;color:#a0a0cc;font-size:12px;font-style:italic}
                `;
                (document.head || document.documentElement).appendChild(style);
            }

            let medalTooltipEl = null;

            function ensureMedalTooltip() {
                if (medalTooltipEl && document.body.contains(medalTooltipEl)) return medalTooltipEl;
                medalTooltipEl = document.createElement('div');
                medalTooltipEl.id = 'ripper-medal-tooltip';
                document.body.appendChild(medalTooltipEl);
                return medalTooltipEl;
            }

            function positionMedalTooltip(target) {
                const rect = target.getBoundingClientRect();
                const tipRect = medalTooltipEl.getBoundingClientRect();
                let left = rect.left + rect.width / 2 - tipRect.width / 2;
                let top = rect.top - tipRect.height - 12;
                if (top < 4) top = rect.bottom + 12;
                if (left < 4) left = 4;
                if (left + tipRect.width > window.innerWidth - 4) left = window.innerWidth - tipRect.width - 4;
                if (top + tipRect.height > window.innerHeight - 4) top = window.innerHeight - tipRect.height - 4;
                medalTooltipEl.style.left = left + 'px';
                medalTooltipEl.style.top = top + 'px';
            }

            function showMedalTooltip(target, medal) {
                const tip = ensureMedalTooltip();
                tip.innerHTML = `<div class="rmt-head"><img src="${getMedalsBaseUrl() + encodeURIComponent(medal.file)}" alt=""><div class="rmt-head-text"><div class="rmt-title">${escapeHtml(medal.title)}</div><div class="rmt-desc">${escapeHtml(medal.description)}</div></div></div>`;
                tip.classList.add('visible');
                requestAnimationFrame(() => positionMedalTooltip(target));
            }

            function hideMedalTooltip() {
                if (medalTooltipEl) medalTooltipEl.classList.remove('visible');
            }

            const MEDALS_MODAL_CLOSE_SVG = '<svg viewBox="0 0 24 24"><path d="M6.414 5 5 6.414l5.588 5.588L5 17.59l1.414 1.414 5.588-5.588 5.588 5.588 1.414-1.414-5.588-5.588 5.588-5.588L17.59 5l-5.588 5.588L6.414 5Z"/></svg>';

            function closeMedalsPopup() {
                const e = document.getElementById('ripper-medals-popup');
                if (e) e.remove();
                closeMedalUsersPopup();
            }

            function closeMedalUsersPopup() {
                const e = document.getElementById('ripper-medals-users-popup');
                if (e) e.remove();
            }

            function openMedalUsersPopup(medalKey, anchorEl) {
                closeMedalUsersPopup();
                const medal = MEDALS_MAP[medalKey];
                if (!medal) return;
                const users = getMedalsUsers(medalKey);

                const popup = document.createElement('div');
                popup.className = 'ripper-medals-popup-users';
                popup.id = 'ripper-medals-users-popup';

                const header = document.createElement('div');
                header.className = 'ripper-medals-popup-users-header';

                const headerImg = document.createElement('img');
                headerImg.src = getMedalsBaseUrl() + encodeURIComponent(medal.file);
                headerImg.alt = medal.title;

                const titleWrap = document.createElement('div');
                titleWrap.className = 'ripper-medals-popup-users-title';

                const titleMain = document.createElement('div');
                titleMain.className = 'ripper-medals-popup-users-title-main';
                titleMain.textContent = medal.title;

                const titleSub = document.createElement('div');
                titleSub.className = 'ripper-medals-popup-users-title-sub';
                titleSub.textContent = `${users.length} обладател${users.length === 1 ? 'ь' : users.length < 5 && users.length > 0 ? 'я' : 'ей'}`;

                titleWrap.appendChild(titleMain);
                titleWrap.appendChild(titleSub);

                const closeBtn = document.createElement('button');
                closeBtn.type = 'button';
                closeBtn.className = 'ripper-medals-popup-close';
                closeBtn.setAttribute('aria-label', 'Закрыть');
                closeBtn.innerHTML = MEDALS_MODAL_CLOSE_SVG;
                closeBtn.addEventListener('click', closeMedalUsersPopup);

                header.appendChild(headerImg);
                header.appendChild(titleWrap);
                header.appendChild(closeBtn);

                const body = document.createElement('div');
                body.className = 'ripper-medals-popup-users-body';

                if (users.length === 0) {
                    const empty = document.createElement('div');
                    empty.className = 'ripper-medals-popup-users-empty';
                    empty.textContent = 'Пока нет обладателей';
                    body.appendChild(empty);
                } else {
                    const list = document.createElement('div');
                    list.className = 'ripper-medals-popup-users-list';
                    users.forEach((u, idx) => {
                        if (idx > 0) {
                            const sep = document.createElement('span');
                            sep.className = 'rmu-sep';
                            sep.textContent = ',';
                            list.appendChild(sep);
                        }
                        const name = document.createElement('span');
                        name.className = 'rmu-name';
                        name.textContent = u;
                        list.appendChild(name);
                    });
                    body.appendChild(list);
                }

                popup.appendChild(header);
                popup.appendChild(body);
                document.body.appendChild(popup);

                if (anchorEl) {
                    const rect = anchorEl.getBoundingClientRect();
                    const popupRect = popup.getBoundingClientRect();
                    let left = rect.right + 8;
                    let top = rect.top;
                    if (left + popupRect.width > window.innerWidth - 8) left = rect.left - popupRect.width - 8;
                    if (left < 8) left = 8;
                    if (top + popupRect.height > window.innerHeight - 8) top = window.innerHeight - popupRect.height - 8;
                    if (top < 8) top = 8;
                    popup.style.left = left + 'px';
                    popup.style.top = top + 'px';
                } else {
                    popup.style.left = '50%';
                    popup.style.top = '50%';
                    popup.style.transform = 'translate(-50%,-50%)';
                }

                setTimeout(() => {
                    const handler = (e) => {
                        if (!popup.contains(e.target) && !(anchorEl && anchorEl.contains(e.target))) {
                            closeMedalUsersPopup();
                            document.removeEventListener('mousedown', handler, true);
                        }
                    };
                    document.addEventListener('mousedown', handler, true);
                }, 10);
            }

            function openMedalsPopup(username, anchorEl) {
                if (!username) return;
                closeMedalsPopup();

                const medals = getUserMedals(username);
                const allMedals = Object.keys(MEDALS_MAP).map(k => ({ key: k, ...MEDALS_MAP[k] }));
                const totalMedals = getAllMedalsCount();
                const earned = medals.length;
                const pct = totalMedals > 0 ? Math.round((earned / totalMedals) * 100) : 0;

                const popup = document.createElement('div');
                popup.className = 'ripper-medals-popup';
                popup.id = 'ripper-medals-popup';

                const header = document.createElement('div');
                header.className = 'ripper-medals-popup-header';

                const headerImg = document.createElement('img');
                headerImg.src = getRipmoreIconUrl();
                headerImg.alt = 'RIPSITE';

                const titleWrap = document.createElement('div');
                titleWrap.className = 'ripper-medals-popup-title';

                const titleMain = document.createElement('div');
                titleMain.className = 'ripper-medals-popup-title-main';
                titleMain.textContent = 'Профиль';

                const titleSub = document.createElement('div');
                titleSub.className = 'ripper-medals-popup-title-sub';
                titleSub.textContent = username;

                titleWrap.appendChild(titleMain);
                titleWrap.appendChild(titleSub);

                const closeBtn = document.createElement('button');
                closeBtn.type = 'button';
                closeBtn.className = 'ripper-medals-popup-close';
                closeBtn.setAttribute('aria-label', 'Закрыть');
                closeBtn.innerHTML = MEDALS_MODAL_CLOSE_SVG;
                closeBtn.addEventListener('click', closeMedalsPopup);

                header.appendChild(headerImg);
                header.appendChild(titleWrap);
                header.appendChild(closeBtn);

                const searchWrap = document.createElement('div');
                searchWrap.className = 'ripper-medals-popup-search';
                const searchInput = document.createElement('input');
                searchInput.type = 'text';
                searchInput.placeholder = 'Поиск достижений...';
                searchWrap.appendChild(searchInput);

                const counter = document.createElement('div');
                counter.className = 'ripper-medals-popup-counter';
                counter.innerHTML = `<span>Получено:</span><span class="rmc-value">${earned}/${totalMedals}</span><span class="rmc-pct">(${pct}%)</span>`;

                const body = document.createElement('div');
                body.className = 'ripper-medals-popup-body';

                function renderBody(query) {
                    while (body.firstChild) body.removeChild(body.firstChild);
                    const q = (query || '').trim().toLowerCase();
                    const filtered = q ? allMedals.filter(m => m.title.toLowerCase().includes(q) || m.description.toLowerCase().includes(q)) : allMedals;
                    if (filtered.length === 0) {
                        const empty = document.createElement('div');
                        empty.className = 'ripper-medals-popup-empty';
                        empty.textContent = q ? 'Ничего не найдено' : 'Нет достижений';
                        body.appendChild(empty);
                        return;
                    }
                    const userMedalKeys = new Set(medals.map(m => m.key));
                    for (const medal of filtered) {
                        const has = userMedalKeys.has(medal.key);
                        const usersCount = getMedalsUsers(medal.key).length;
                        const medalPct = getMedalPercent(medal.key);
                        const item = document.createElement('div');
                        item.className = 'ripper-medals-popup-item' + (has ? '' : ' locked');

                        const img = document.createElement('img');
                        img.src = getMedalsBaseUrl() + encodeURIComponent(medal.file);
                        img.alt = medal.title;
                        img.loading = 'lazy';
                        img.decoding = 'async';
                        img.addEventListener('mouseenter', () => showMedalTooltip(img, medal));
                        img.addEventListener('mouseleave', hideMedalTooltip);

                        const info = document.createElement('div');
                        info.className = 'ripper-medals-popup-item-info';

                        const t = document.createElement('div');
                        t.className = 'ripper-medals-popup-item-title';
                        t.textContent = medal.title;

                        const d = document.createElement('div');
                        d.className = 'ripper-medals-popup-item-desc';
                        d.textContent = medal.description;

                        info.appendChild(t);
                        info.appendChild(d);

                        const cnt = document.createElement('div');
                        cnt.className = 'ripper-medals-popup-item-count';
                        cnt.innerHTML = `<span class="rmc-people">${usersCount}</span><span class="rmc-pct">${medalPct}%</span>`;

                        item.appendChild(img);
                        item.appendChild(info);
                        item.appendChild(cnt);
                        item.addEventListener('click', (e) => {
                            e.stopPropagation();
                            openMedalUsersPopup(medal.key, item);
                        });
                        body.appendChild(item);
                    }
                }

                renderBody('');
                searchInput.addEventListener('input', () => renderBody(searchInput.value));
                searchInput.addEventListener('mousedown', (e) => e.stopPropagation());

                popup.appendChild(header);
                popup.appendChild(searchWrap);
                popup.appendChild(counter);
                popup.appendChild(body);
                document.body.appendChild(popup);

                if (anchorEl) {
                    const rect = anchorEl.getBoundingClientRect();
                    const popupRect = popup.getBoundingClientRect();
                    let left = rect.left + rect.width / 2 - popupRect.width / 2;
                    let top = rect.bottom + 8;
                    if (top + popupRect.height > window.innerHeight - 8) top = rect.top - popupRect.height - 8;
                    if (top < 8) top = 8;
                    if (left < 8) left = 8;
                    if (left + popupRect.width > window.innerWidth - 8) left = window.innerWidth - popupRect.width - 8;
                    popup.style.left = left + 'px';
                    popup.style.top = top + 'px';
                } else {
                    popup.style.left = '50%';
                    popup.style.top = '50%';
                    popup.style.transform = 'translate(-50%,-50%)';
                }

                setTimeout(() => {
                    const handler = (e) => {
                        if (!popup.contains(e.target) && !(anchorEl && anchorEl.contains(e.target)) && !e.target.closest('.ripper-medals-popup-users')) {
                            closeMedalsPopup();
                            document.removeEventListener('mousedown', handler, true);
                        }
                    };
                    document.addEventListener('mousedown', handler, true);
                }, 10);

                if (!window.__ripperMedalsEscHandler) {
                    window.__ripperMedalsEscHandler = true;
                    document.addEventListener('keydown', (e) => {
                        if (e.key === 'Escape') { closeMedalsPopup(); closeMedalUsersPopup(); }
                    }, true);
                }
            }

            function openMedals(username, anchorEl) { openMedalsPopup(username, anchorEl); }

            function twitchStartObserver() {
                if (twitchObserver) twitchObserver.disconnect();
                twitchObserver = new MutationObserver((mutations) => {
                    if (!isRipperChannel) return;
                    let extTouched = false;
                    const chatLines = new Set();
                    const viewerCards = new Set();
                    for (const m of mutations) {
                        for (const node of m.addedNodes) {
                            if (node.nodeType !== 1) continue;
                            if (node.matches && node.matches('.chat-line__message')) chatLines.add(node);
                            else if (node.querySelectorAll) {
                                const msgs = node.querySelectorAll('.chat-line__message');
                                for (const msg of msgs) chatLines.add(msg);
                            }
                            if (node.matches && node.matches('.viewer-card')) viewerCards.add(node);
                            else if (node.querySelectorAll) {
                                const cards = node.querySelectorAll('.viewer-card');
                                for (const card of cards) viewerCards.add(card);
                            }
                            if (node.matches && (node.matches('.extension-panel') || node.querySelector('.extension-panel'))) extTouched = true;
                        }
                    }
                    if (chatLines.size && isRankBadgesEnabled()) chatLines.forEach(twitchProcessChatLine);
                    if (viewerCards.size && isRankBadgesEnabled()) viewerCards.forEach(attachBadgesToViewerCard);
                    if (extTouched && isEnabled('twitch_leaderboard')) twitchReplaceLeaderboardPanels();
                });
                twitchObserver.observe(document.documentElement, { childList: true, subtree: true });
            }

            function smileInit() {
                if (smileInitialized) return;
                smileInitialized = true;
                loadSmileSettings();
                injectSmileStyles();
                applyEmojiScale();
                processAllChat();
                ensureButton();
                startSmileObserver();
                startImageCodeObserver();
                if (smileButtonInterval) clearInterval(smileButtonInterval);
                smileButtonInterval = setInterval(() => {
                    if (!isRipperChannel) return;
                    ensureButton();
                }, 2000);
            }

            function twitchInit() {
                if (twitchInitialized) return;
                if (!isRipperChannel) return;
                twitchInitialized = true;
                twitchInitToken++;
                twitchInjectStyles();
                injectMedalStyles();
                TWITCH_RANK_MAP = twitchBuildRankMap();
                twitchStartObserver();
                twitchScanAndApply(true);
                if (twitchInterval) clearInterval(twitchInterval);
                twitchInterval = setInterval(() => {
                    if (!isRipperChannel) return;
                    twitchScanAndApply(false);
                }, 6000);
                if (isEnabled('twitch_leaderboard')) {
                    if (twitchLeaderboardInterval) clearInterval(twitchLeaderboardInterval);
                    twitchLeaderboardInterval = setInterval(() => {
                        if (!isRipperChannel) return;
                        twitchReplaceLeaderboardPanels();
                    }, 3000);
                }
                smileInit();
            }

            function twitchDestroy() {
                twitchInitToken++;
                twitchInitialized = false;
                smileInitialized = false;
                TWITCH_RANK_MAP = null;
                menuOpen = false;
                settingsPanelOpen = false;
                menuSearchQuery = '';
                tooltipCurrentCode = null;

                if (twitchObserver) { twitchObserver.disconnect(); twitchObserver = null; }
                if (twitchChatObserver) { twitchChatObserver.disconnect(); twitchChatObserver = null; }
                if (twitchInterval) { clearInterval(twitchInterval); twitchInterval = null; }
                if (twitchLeaderboardInterval) { clearInterval(twitchLeaderboardInterval); twitchLeaderboardInterval = null; }
                if (smileButtonInterval) { clearInterval(smileButtonInterval); smileButtonInterval = null; }
                pendingChatRoots.clear();
                pendingTextNodes.clear();
                flushScheduled = false;

                document.querySelectorAll('.ripper-rank-badge').forEach(el => el.remove());
                document.querySelectorAll('.ripper-leaderboard').forEach(el => el.remove());
                document.querySelectorAll('.ripper-smile-emoji').forEach(el => {
                    const code = el.getAttribute('aria-label') || el.getAttribute('alt') || '';
                    const txt = document.createTextNode(code);
                    if (el.parentNode) el.parentNode.replaceChild(txt, el);
                });
                document.querySelectorAll('.ripper-img-processed').forEach(el => {
                    const code = el.querySelector('a')?.textContent || '';
                    const txt = document.createTextNode(code);
                    if (el.parentNode) el.parentNode.replaceChild(txt, el);
                });
                document.querySelectorAll('.ripper-medals-popup, .ripper-medals-popup-users, .ripper-medal-tooltip').forEach(el => el.remove());
                const menu = document.getElementById(MENU_ID);
                if (menu) menu.remove();
                const root = document.getElementById(ROOT_ID);
                if (root) root.remove();
                const tooltip = document.getElementById(TOOLTIP_ID);
                if (tooltip) tooltip.remove();
                const smileStyles = document.getElementById('ripper-smile-styles');
                if (smileStyles) smileStyles.remove();
                const twitchStyles = document.getElementById('ripper-twitch-styles');
                if (twitchStyles) twitchStyles.remove();
                const medalStyles = document.getElementById('ripper-medal-styles');
                if (medalStyles) medalStyles.remove();
                webmPools.forEach(pool => {
                    if (pool.video && pool.video.parentNode) pool.video.parentNode.removeChild(pool.video);
                });
                webmPools.clear();

                ['ripper-screenshot-btn', 'ripper-upload-btn', 'ripper-voice-btn'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.remove();
                });
                ['ripper-upload-menu', 'ripper-voice-menu', 'ripper-voice-settings'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.remove();
                });
                if (window.__RV_isRecording && window.__RV_stopRecording) {
                    const vb = document.getElementById('ripper-voice-btn');
                    if (vb) { try { window.__RV_stopRecording(vb); } catch (e) { } }
                }
            }

            function getChannelFromPath() {
                const path = location.pathname;
                const match = path.match(/^\/([a-zA-Z0-9_]+)/);
                return match ? match[1].toLowerCase() : '';
            }

            function checkChannel() {
                const channel = getChannelFromPath();
                const isRipper = channel === 'ripper_cmertanoc';
                if (isRipper !== isRipperChannel) {
                    isRipperChannel = isRipper;
                    currentChannel = channel;
                    if (isRipperChannel) twitchInit();
                    else twitchDestroy();
                } else if (isRipperChannel && channel !== currentChannel) {
                    currentChannel = channel;
                }
                if (isRipperChannel && !twitchInitialized) {
                    twitchInit();
                }
            }

            async function initTwitchData() {
                try {
                    const customDb = await loadCustomDatabase();
                    const smileMap = customDb && customDb.SMILE_MAP && typeof customDb.SMILE_MAP === 'object' ? customDb.SMILE_MAP : null;
                    const medalsMap = customDb && customDb.MEDALS_MAP && typeof customDb.MEDALS_MAP === 'object' ? customDb.MEDALS_MAP : null;
                    SMILE_MAP = smileMap || {};
                    MEDALS_MAP = medalsMap || {};
                } catch (e) {
                    console.warn('RIPMORE: failed to load custom database, using empty maps', e);
                    SMILE_MAP = {};
                    MEDALS_MAP = {};
                }
                buildSmileCache();
                TWITCH_RANK_MAP = twitchBuildRankMap();
                checkChannel();
                if (twitchInitialized) {
                    twitchScanAndApply(true);
                    if (isEnabled('twitch_leaderboard')) twitchReplaceLeaderboardPanels();
                }
            }

            initTwitchData();

            let lastPath = location.pathname;

            function startChannelWatcher() {
                setInterval(() => {
                    const nowPath = location.pathname;
                    if (nowPath !== lastPath) {
                        lastPath = nowPath;
                        checkChannel();
                    } else {
                        checkChannel();
                    }
                }, 500);

                window.addEventListener('popstate', () => setTimeout(checkChannel, 50));

                const origPush = history.pushState;
                const origReplace = history.replaceState;
                history.pushState = function () {
                    origPush.apply(this, arguments);
                    setTimeout(checkChannel, 50);
                };
                history.replaceState = function () {
                    origReplace.apply(this, arguments);
                    setTimeout(checkChannel, 50);
                };
            }

            startChannelWatcher();

            (function initTwitchChatButtons() {
                const SCREENSHOT_BTN_ID = 'ripper-screenshot-btn';
                const UPLOAD_BTN_ID = 'ripper-upload-btn';
                const UPLOAD_MENU_ID = 'ripper-upload-menu';

                const THEME = {
                    bg: '#09090f', card: '#101015', accent: '#c11f2b', accentHover: '#d4232f',
                    text: '#e0e0ff', textMuted: '#a0a0cc', border: '#1e1e28'
                };

                let isUploading = false;

                async function convertToPng(blob) {
                    if (blob.type === 'image/png') return blob;
                    const bitmap = await createImageBitmap(blob);
                    if (typeof OffscreenCanvas !== 'undefined') {
                        try {
                            const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
                            const ctx = canvas.getContext('2d');
                            ctx.drawImage(bitmap, 0, 0);
                            bitmap.close();
                            return await canvas.convertToBlob({ type: 'image/png' });
                        } catch (e) { }
                    }
                    return new Promise((resolve, reject) => {
                        const canvas = document.createElement('canvas');
                        canvas.width = bitmap.width;
                        canvas.height = bitmap.height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(bitmap, 0, 0);
                        bitmap.close();
                        canvas.toBlob((b) => {
                            if (b) resolve(b);
                            else reject(new Error('Не удалось конвертировать в PNG'));
                        }, 'image/png');
                    });
                }

                function insertCodeIntoChat(text) {
                    const chatInput = document.querySelector('[data-a-target="chat-input"][contenteditable="true"]');
                    if (!chatInput) return;
                    chatInput.focus();
                    const sel = window.getSelection();
                    if (!sel.rangeCount || !chatInput.contains(sel.anchorNode)) {
                        const range = document.createRange();
                        range.selectNodeContents(chatInput);
                        range.collapse(false);
                        sel.removeAllRanges();
                        sel.addRange(range);
                    }
                    try {
                        document.execCommand('insertText', false, text);
                    } catch (e) {
                        const range = sel.getRangeAt(0);
                        const textNode = document.createTextNode(text);
                        range.deleteContents();
                        range.insertNode(textNode);
                        range.setStartAfter(textNode);
                        range.collapse(true);
                        sel.removeAllRanges();
                        sel.addRange(range);
                    }
                    chatInput.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertText', data: text }));
                    chatInput.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertText', data: text }));
                }
                function sanitizeCode(str) {
                    return String(str || '')
                        .replace(/[\uFEFF\u200B\u200C\u200D\u2060]/g, '')
                        .replace(/\s+/g, '')
                        .trim();
                }
                function uploadAndInsert(file) {
                    if (isUploading) {
                        alert('Дождитесь завершения текущей загрузки.');
                        return;
                    }
                    isUploading = true;
                    setButtonBusy(true);

                    const formData = new FormData();
                    formData.append('file', file);

                    const finish = () => {
                        isUploading = false;
                        setButtonBusy(false);
                    };

                    GM_xmlhttpRequest({
                        method: 'POST',
                        url: UPLOAD_URL,
                        data: formData,
                        fetch: true,
                        onload: function (response) {
                            if (response.status >= 200 && response.status < 300) {
                                const url = response.responseText.trim();
                                const match = url.match(/\/([^\/]+)\.(png|jpe?g|webp|gif)$/i);
                                let code = '';
                                let realExt = null;
                                if (match && match[1]) {
                                    code = match[1];
                                    realExt = match[2].toLowerCase();
                                    if (realExt === 'jpeg') realExt = 'jpg';
                                } else {
                                    const lastPart = url.split('/').pop();
                                    code = lastPart.split('.')[0];
                                }
                                if (code) {
                                    if (realExt) cacheSet(code, realExt);
                                    insertCodeIntoChat(`<${code}>`);
                                } else {
                                    alert('Не удалось получить код изображения. Ответ: ' + url);
                                }
                            } else {
                                alert('Ошибка загрузки: ' + response.status);
                            }
                            finish();
                        },
                        onerror: function () {
                            alert('Ошибка сети при загрузке.');
                            finish();
                        },
                        ontimeout: function () {
                            alert('Таймаут загрузки.');
                            finish();
                        }
                    });
                }

                function setButtonBusy(busy) {
                    const btn = document.getElementById(UPLOAD_BTN_ID);
                    if (!btn) return;
                    btn.style.opacity = busy ? '0.4' : '1';
                    btn.style.cursor = busy ? 'default' : 'pointer';
                }

                function showUploadMenu(chatInput) {
                    const existing = document.getElementById(UPLOAD_MENU_ID);
                    if (existing) existing.remove();

                    const menu = document.createElement('div');
                    menu.id = UPLOAD_MENU_ID;
                    menu.style.cssText = `
                        position: fixed;
                        background: ${THEME.card};
                        border: 1px solid ${THEME.border};
                        border-radius: 12px;
                        padding: 6px;
                        display: flex;
                        flex-direction: column;
                        gap: 4px;
                        z-index: 2147483647;
                        box-shadow: 0 8px 28px rgba(0,0,0,0.7);
                        min-width: 180px;
                        font-family: 'Inter', system-ui, sans-serif;
                    `;

                    const btnFile = document.createElement('button');
                    btnFile.type = 'button';
                    btnFile.innerHTML = '&#128193; С ПК';
                    btnFile.style.cssText = `display:flex;align-items:center;gap:8px;padding:10px 14px;background:transparent;border:none;border-radius:8px;color:${THEME.text};cursor:pointer;text-align:left;font-size:13px;font-weight:600;transition:background .15s;`;
                    btnFile.onmouseover = () => btnFile.style.background = 'rgba(193,31,43,.15)';
                    btnFile.onmouseout = () => btnFile.style.background = 'transparent';
                    btnFile.onclick = () => {
                        menu.remove();
                        if (isUploading) { alert('Дождитесь завершения текущей загрузки.'); return; }
                        const fileInput = document.createElement('input');
                        fileInput.type = 'file';
                        fileInput.accept = ALLOWED_MIME.join(',');
                        fileInput.style.display = 'none';
                        fileInput.addEventListener('change', (e) => {
                            const file = e.target.files[0];
                            if (!file) return;
                            const ext = file.name.split('.').pop().toLowerCase();
                            if (!ALLOWED_EXTS.includes(ext)) {
                                alert('Можно загружать только PNG, JPEG, JPG, WEBP или GIF.');
                                return;
                            }
                            uploadAndInsert(file);
                        });
                        document.body.appendChild(fileInput);
                        fileInput.click();
                        setTimeout(() => fileInput.remove(), 1000);
                    };

                    const btnClip = document.createElement('button');
                    btnClip.type = 'button';
                    btnClip.innerHTML = '&#128203; Из буфера';
                    btnClip.style.cssText = `display:flex;align-items:center;gap:8px;padding:10px 14px;background:transparent;border:none;border-radius:8px;color:${THEME.text};cursor:pointer;text-align:left;font-size:13px;font-weight:600;transition:background .15s;`;
                    btnClip.onmouseover = () => btnClip.style.background = 'rgba(193,31,43,.15)';
                    btnClip.onmouseout = () => btnClip.style.background = 'transparent';
                    btnClip.onclick = async () => {
                        menu.remove();
                        if (isUploading) { alert('Дождитесь завершения текущей загрузки.'); return; }
                        try {
                            if (!navigator.clipboard || !navigator.clipboard.read) {
                                alert('Браузер не поддерживает чтение из буфера. Используйте выбор с ПК.');
                                return;
                            }
                            const items = await navigator.clipboard.read();
                            let imageBlob = null;
                            for (const item of items) {
                                const imageType = item.types.find(t => ALLOWED_MIME.includes(t.toLowerCase()));
                                if (imageType) {
                                    imageBlob = await item.getType(imageType);
                                    break;
                                }
                            }
                            if (!imageBlob) {
                                alert('В буфере нет изображения');
                                return;
                            }
                            const pngBlob = await convertToPng(imageBlob);
                            const file = new File([pngBlob], 'clipboard.png', { type: 'image/png' });
                            uploadAndInsert(file);
                        } catch (err) {
                            console.error(err);
                            alert('Не удалось прочитать буфер: ' + err.message);
                        }
                    };

                    menu.appendChild(btnFile);
                    menu.appendChild(btnClip);
                    document.body.appendChild(menu);

                    const btn = document.getElementById(UPLOAD_BTN_ID);
                    const rect = btn ? btn.getBoundingClientRect() : { left: window.innerWidth / 2, bottom: window.innerHeight / 2, top: window.innerHeight / 2 };
                    const menuRect = menu.getBoundingClientRect();
                    let left = rect.left - menuRect.width / 2 + rect.width / 2;
                    let top = rect.top - menuRect.height - 8;
                    if (top < 4) top = rect.bottom + 8;
                    if (left < 4) left = 4;
                    if (left + menuRect.width > window.innerWidth - 4) left = window.innerWidth - menuRect.width - 4;
                    menu.style.left = left + 'px';
                    menu.style.top = top + 'px';

                    setTimeout(() => {
                        const handler = (e) => {
                            if (!menu.contains(e.target) && e.target.id !== UPLOAD_BTN_ID) {
                                menu.remove();
                                document.removeEventListener('mousedown', handler, true);
                            }
                        };
                        document.addEventListener('mousedown', handler, true);
                    }, 10);
                }

                async function takeScreenshot() {
                    const video = document.querySelector('video');
                    if (!video) {
                        alert('Видео не найдено на странице.');
                        return;
                    }

                    const canvas = document.createElement('canvas');
                    canvas.width = video.videoWidth || video.clientWidth;
                    canvas.height = video.videoHeight || video.clientHeight;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
                    if (!blob) {
                        alert('Не удалось создать скриншот.');
                        return;
                    }

                    const url = URL.createObjectURL(blob);
                    const img = new Image();
                    img.src = url;

                    const overlay = document.createElement('div');
                    overlay.style.cssText = `
    position: fixed;
    z-index: 2147483647;
    right: 18px;
    bottom: 18px;
    background: ${THEME.card};
    border: 1px solid ${THEME.border};
    border-radius: 14px;
    max-width: 380px;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 16px 48px rgba(0,0,0,0.85);
    overflow: hidden;
    font-family: 'Inter', system-ui, sans-serif;
    color: ${THEME.text};
`;

                    const modal = document.createElement('div');
                    modal.style.cssText = `display:flex;flex-direction:column;max-height:80vh;overflow:hidden;`;

                    const header = document.createElement('div');
                    header.style.cssText = `display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid ${THEME.border};background:${THEME.bg};flex-shrink:0;`;
                    header.innerHTML = `<div style="font-family:'Orbitron','Inter',sans-serif;font-weight:700;font-size:12px;letter-spacing:.8px;color:#fff;text-transform:uppercase;">Скриншот</div>`;

                    const closeBtn = document.createElement('button');
                    closeBtn.type = 'button';
                    closeBtn.innerHTML = '✕';
                    closeBtn.style.cssText = `background:transparent;border:none;color:${THEME.textMuted};font-size:16px;cursor:pointer;padding:0;width:24px;height:24px;display:flex;align-items:center;justify-content:center;border-radius:6px;transition:background .15s;`;
                    closeBtn.onmouseover = () => closeBtn.style.background = 'rgba(255,255,255,.1)';
                    closeBtn.onmouseout = () => closeBtn.style.background = 'transparent';
                    closeBtn.onclick = () => { overlay.remove(); URL.revokeObjectURL(url); };
                    header.appendChild(closeBtn);

                    const body = document.createElement('div');
                    body.style.cssText = `padding:10px;overflow:auto;display:flex;align-items:center;justify-content:center;background:${THEME.bg};`;
                    const preview = document.createElement('img');
                    preview.src = url;
                    preview.style.cssText = `max-width:100%;max-height:45vh;border-radius:8px;display:block;object-fit:contain;`;
                    body.appendChild(preview);

                    const footer = document.createElement('div');
                    footer.style.cssText = `display:flex;align-items:center;gap:6px;padding:10px 14px;border-top:1px solid ${THEME.border};background:${THEME.bg};flex-shrink:0;flex-wrap:wrap;`;

                    const btnDownload = document.createElement('button');
                    btnDownload.type = 'button';
                    btnDownload.textContent = 'Скачать';
                    btnDownload.style.cssText = `flex:1;display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:10px 16px;background:${THEME.card};border:1px solid ${THEME.border};border-radius:10px;color:${THEME.text};font-family:'Orbitron','Inter',sans-serif;font-weight:700;font-size:11px;letter-spacing:1px;text-transform:uppercase;cursor:pointer;transition:border-color .15s,background .15s;`;
                    btnDownload.onmouseover = () => { btnDownload.style.borderColor = THEME.accent; btnDownload.style.background = 'rgba(193,31,43,.1)'; };
                    btnDownload.onmouseout = () => { btnDownload.style.borderColor = THEME.border; btnDownload.style.background = THEME.card; };
                    btnDownload.onclick = () => {
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'screenshot-' + Date.now() + '.png';
                        a.click();
                    };

                    const btnClipboard = document.createElement('button');
                    btnClipboard.type = 'button';
                    btnClipboard.textContent = 'В буфер';
                    btnClipboard.style.cssText = `flex:1;display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:10px 16px;background:${THEME.card};border:1px solid ${THEME.border};border-radius:10px;color:${THEME.text};font-family:'Orbitron','Inter',sans-serif;font-weight:700;font-size:11px;letter-spacing:1px;text-transform:uppercase;cursor:pointer;transition:border-color .15s,background .15s;`;
                    btnClipboard.onmouseover = () => { btnClipboard.style.borderColor = THEME.accent; btnClipboard.style.background = 'rgba(193,31,43,.1)'; };
                    btnClipboard.onmouseout = () => { btnClipboard.style.borderColor = THEME.border; btnClipboard.style.background = THEME.card; };
                    btnClipboard.onclick = async () => {
                        try {
                            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
                            btnClipboard.textContent = 'Скопировано!';
                            setTimeout(() => { btnClipboard.textContent = 'В буфер'; }, 1500);
                        } catch (err) {
                            alert('Не удалось скопировать: ' + err.message);
                        }
                    };

                    const btnChat = document.createElement('button');
                    btnChat.type = 'button';
                    btnChat.textContent = 'В чат';
                    btnChat.style.cssText = `flex:1;display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:10px 16px;background:${THEME.accent};border:1px solid ${THEME.accent};border-radius:10px;color:#fff;font-family:'Orbitron','Inter',sans-serif;font-weight:700;font-size:11px;letter-spacing:1px;text-transform:uppercase;cursor:pointer;transition:background .15s;box-shadow:0 4px 14px rgba(193,31,43,.3);`;
                    btnChat.onmouseover = () => { btnChat.style.background = THEME.accentHover; btnChat.style.borderColor = THEME.accentHover; };
                    btnChat.onmouseout = () => { btnChat.style.background = THEME.accent; btnChat.style.borderColor = THEME.accent; };
                    btnChat.onclick = async () => {
                        const file = new File([blob], 'screenshot.png', { type: 'image/png' });
                        uploadAndInsert(file);
                        overlay.remove();
                        URL.revokeObjectURL(url);
                    };

                    footer.appendChild(btnDownload);
                    footer.appendChild(btnClipboard);
                    footer.appendChild(btnChat);

                    modal.appendChild(header);
                    modal.appendChild(body);
                    modal.appendChild(footer);
                    overlay.appendChild(modal);
                    document.body.appendChild(overlay);

                    overlay.addEventListener('click', (e) => {
                        if (e.target === overlay) {
                            overlay.remove();
                            URL.revokeObjectURL(url);
                        }
                    });

                    document.addEventListener('keydown', function escHandler(e) {
                        if (e.key === 'Escape') {
                            overlay.remove();
                            URL.revokeObjectURL(url);
                            document.removeEventListener('keydown', escHandler, true);
                        }
                    }, true);
                }

                function ensureChatButtons() {
                    if (!isRipperChannel) return;

                    const buttonsContainer = document.querySelector(
                        '[data-test-selector="chat-input-buttons-container"]'
                    );

                    const chatInput = document.querySelector(
                        '[data-a-target="chat-input"][contenteditable="true"]'
                    );

                    let container = null;
                    let useAbsolute = false;

                    if (buttonsContainer) {
                        container =
                            buttonsContainer.querySelector('[style*="margin-inline-end: auto"]') ||
                            buttonsContainer.firstElementChild ||
                            buttonsContainer;
                    } else if (chatInput) {
                        container = chatInput.closest('.chat-wysiwyg-input') || chatInput.parentElement;
                        useAbsolute = true;
                    }

                    if (!container) return;

                    if (document.getElementById(SCREENSHOT_BTN_ID)) return;

                    const inlineBase = `
        background: transparent;
        border: none;
        color: ${THEME.textMuted};
        cursor: pointer;
        padding: 0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border-radius: 6px;
        pointer-events: auto;
        transition: color 0.15s, background 0.15s;
    `;

                    const absoluteBase = (rightPx) => `
        position: absolute;
        right: ${rightPx}px;
        top: 50%;
        transform: translateY(-50%);
        background: transparent;
        border: none;
        color: ${THEME.textMuted};
        cursor: pointer;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        z-index: 1000;
        pointer-events: auto;
        transition: color 0.15s;
    `;

                    if (useAbsolute) {
                        if (getComputedStyle(container).position === 'static') {
                            container.style.position = 'relative';
                        }
                    } else if (container.tagName === 'DIV' && !container.style.display) {
                        container.style.display = 'inline-flex';
                        container.style.alignItems = 'center';
                        container.style.gap = '2px';
                    }

                    const screenshotBtn = document.createElement('button');
                    screenshotBtn.id = SCREENSHOT_BTN_ID;
                    screenshotBtn.type = 'button';
                    screenshotBtn.setAttribute('aria-label', 'Сделать скриншот');
                    screenshotBtn.title = 'Сделать скриншот';
                    screenshotBtn.style.cssText = useAbsolute ? absoluteBase(76) : inlineBase;
                    screenshotBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/></svg>`;
                    screenshotBtn.onmouseover = () => {
                        screenshotBtn.style.color = THEME.accent;
                        if (!useAbsolute) screenshotBtn.style.background = 'rgba(193,31,43,.12)';
                    };
                    screenshotBtn.onmouseout = () => {
                        screenshotBtn.style.color = THEME.textMuted;
                        if (!useAbsolute) screenshotBtn.style.background = 'transparent';
                    };
                    screenshotBtn.onclick = (e) => {
                        e.stopPropagation();
                        takeScreenshot();
                    };

                    const uploadBtn = document.createElement('button');
                    uploadBtn.id = UPLOAD_BTN_ID;
                    uploadBtn.type = 'button';
                    uploadBtn.setAttribute('aria-label', 'Загрузить изображение');
                    uploadBtn.title = 'Загрузить изображение (png/jpeg/webp/gif)';
                    uploadBtn.style.cssText = useAbsolute ? absoluteBase(44) : inlineBase;
                    uploadBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/></svg>`;
                    uploadBtn.onmouseover = () => {
                        uploadBtn.style.color = THEME.accent;
                        if (!useAbsolute) uploadBtn.style.background = 'rgba(193,31,43,.12)';
                    };
                    uploadBtn.onmouseout = () => {
                        uploadBtn.style.color = THEME.textMuted;
                        if (!useAbsolute) uploadBtn.style.background = 'transparent';
                    };
                    uploadBtn.onclick = (e) => {
                        e.stopPropagation();
                        if (isUploading) return;
                        showUploadMenu(chatInput);
                    };


                    const voiceBtn = document.createElement('button');
                    voiceBtn.id = 'ripper-voice-btn';
                    voiceBtn.type = 'button';
                    voiceBtn.setAttribute('aria-label', 'Голосовое сообщение');
                    voiceBtn.title = 'Голосовое сообщение';
                    voiceBtn.style.cssText = useAbsolute ? absoluteBase(12) : inlineBase;
                    voiceBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z"/></svg>';
                    voiceBtn.onmouseover = () => {
                        voiceBtn.style.color = THEME.accent;
                        if (!useAbsolute) voiceBtn.style.background = 'rgba(193,31,43,.12)';
                    };
                    voiceBtn.onmouseout = () => {
                        voiceBtn.style.color = THEME.textMuted;
                        if (!useAbsolute) voiceBtn.style.background = 'transparent';
                    };
                    voiceBtn.onclick = (e) => {
                        e.stopPropagation();
                        if (window.__RV_isRecording) { window.__RV_stopRecording(voiceBtn); return; }
                        if (window.__RV_startRecording) window.__RV_startRecording(voiceBtn);
                    };

                    if (useAbsolute) {
                        container.appendChild(screenshotBtn);
                        container.appendChild(uploadBtn);
                        container.appendChild(voiceBtn);
                    } else {
                        container.insertBefore(voiceBtn, container.firstChild);
                        container.insertBefore(uploadBtn, container.firstChild);
                        container.insertBefore(screenshotBtn, container.firstChild);
                    }
                }

                function startChatButtons() {
                    const observer = new MutationObserver(() => {
                        if (!isRipperChannel) return;
                        if (!document.getElementById(SCREENSHOT_BTN_ID)) {
                            ensureChatButtons();
                        }
                    });
                    observer.observe(document.body, { childList: true, subtree: true });
                    setInterval(() => {
                        if (isRipperChannel && !document.getElementById(SCREENSHOT_BTN_ID)) ensureChatButtons();
                    }, 2000);
                }

                startChatButtons();
            })();

        })();
    }

    if (IS_KINOPOISK && isEnabled('kinopoisk_review') && isSiteInfoEnabled()) {
        (function initKinopoisk() {
            const DB_PATH = '/BD/movie_database.json';
            const HOST_IDS = {
                block: 'ripper-movie-block-host',
                skeleton: 'ripper-movie-skeleton-host',
                suggest: 'ripper-movie-suggest-host'
            };
            let DB_CACHE = null;
            let DB_PROMISE = null;
            let CURRENT_TITLE = '';

            const THEME = {
                bg: '#09090f', card: '#101015', accent: '#c11f2b', accentHover: '#d4232f',
                text: '#e0e0ff', textMuted: '#a0a0cc', border: '#1e1e28'
            };
            const FONT = "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
            const FONT_TITLE = "'Orbitron', 'Inter', system-ui, -apple-system, sans-serif";

            const SHARED_CSS = `:host{display:block;width:100%;font-family:${FONT}!important;font-size:15px!important;font-weight:400!important;font-style:normal!important;line-height:1.6!important;letter-spacing:normal!important;text-transform:none!important;text-align:left!important;color:${THEME.text}!important;-webkit-font-smoothing:antialiased!important;-moz-osx-font-smoothing:grayscale!important;text-rendering:optimizeLegibility!important;font-variant-ligatures:none!important;font-feature-settings:normal!important}*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;font-family:inherit;font-weight:inherit;font-style:inherit;line-height:inherit;letter-spacing:inherit;text-transform:inherit;text-align:inherit;color:inherit;-webkit-font-smoothing:inherit;-moz-osx-font-smoothing:inherit}`;

            const CARD_CSS = SHARED_CSS + `
                .card{background:${THEME.card};border:1px solid ${THEME.border};border-radius:18px;overflow:hidden;line-height:1.6;box-shadow:0 12px 48px rgba(0,0,0,.6);width:100%;animation:fadeIn .4s ease-out}
                @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
                .header{display:flex;align-items:center;gap:14px;padding:20px 24px 16px;border-bottom:1px solid ${THEME.border};background:${THEME.bg}}
                .info{display:flex;flex-direction:column;gap:3px;min-width:0;flex:1}
                .name{font-family:${FONT_TITLE}!important;font-weight:700!important;font-size:17px!important;letter-spacing:.8px!important;color:#fff!important;line-height:1.2!important;text-shadow:0 1px 4px rgba(0,0,0,.6)}
                .status{font-family:${FONT_TITLE}!important;font-weight:700!important;font-size:11.5px!important;letter-spacing:1px!important;text-transform:uppercase!important;color:${THEME.textMuted}!important;line-height:1!important}
                .rank{display:inline-flex;align-items:center;justify-content:center;font-family:${FONT_TITLE}!important;font-size:24px!important;font-weight:900!important;color:#fff!important;width:54px;height:54px;letter-spacing:normal!important;text-shadow:0 3px 12px rgba(0,0,0,.7);clip-path:polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);position:relative;flex-shrink:0;filter:drop-shadow(0 4px 12px rgba(0,0,0,.5))}
                .rank::before,.rank::after{content:'';position:absolute;clip-path:polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);z-index:1}
                .rank::before{inset:4px;background:rgba(16,16,21,.9)}
                .rank::after{inset:7px;background:rgba(16,16,21,.98)}
                .rank>span{position:relative;z-index:3;line-height:1;font-family:${FONT_TITLE}!important;font-weight:900!important;color:#fff!important}
                .rank.rank-10{background:linear-gradient(135deg,#c11f2b,#6a0f17)}
                .rank.rank-9{background:linear-gradient(135deg,#c11f2b,#8a1520)}
                .rank.rank-8{background:linear-gradient(135deg,#8a1520,#4a0a10)}
                .rank.rank-7{background:linear-gradient(135deg,#5a3a7a,#2a1a3a)}
                .rank.rank-6{background:linear-gradient(135deg,#2a4a5a,#152530)}
                .rank.rank-5{background:linear-gradient(135deg,#3a3a5a,#1a1a2e)}
                .rank.rank-4,.rank.rank-3,.rank.rank-2,.rank.rank-1,.rank.rank-_{background:linear-gradient(135deg,#2a2a3a,#151520)}
                .body{padding:20px 24px 22px;background:${THEME.card}}
                .quote{font-family:${FONT}!important;font-size:15px!important;font-weight:400!important;font-style:normal!important;line-height:1.7!important;letter-spacing:normal!important;color:${THEME.text}!important;white-space:pre-wrap;word-break:break-word;border-left:2px solid rgba(193,31,43,.35);padding-left:14px;max-height:360px;overflow-y:auto;scrollbar-width:thin;scrollbar-color:${THEME.accent} ${THEME.border}}
                .quote::-webkit-scrollbar{width:6px}
                .quote::-webkit-scrollbar-track{background:${THEME.border};border-radius:3px}
                .quote::-webkit-scrollbar-thumb{background:${THEME.accent};border-radius:3px}
                .footer{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 24px 18px;border-top:1px solid ${THEME.border};background:${THEME.bg};flex-wrap:wrap}
                .date{font-family:${FONT}!important;font-size:13px!important;font-weight:400!important;font-style:italic!important;letter-spacing:.3px!important;color:${THEME.textMuted}!important;line-height:1.4!important;display:flex;align-items:center;gap:8px}
                .date svg{width:14px;height:14px;fill:currentColor;opacity:.7}
                .footer-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
                .link,.back{display:inline-flex;align-items:center;justify-content:center;gap:8px;font-family:${FONT_TITLE}!important;font-weight:700!important;font-size:12.5px!important;letter-spacing:1px!important;line-height:1!important;text-transform:uppercase!important;padding:9px 18px;border-radius:10px;border:1px solid transparent;cursor:pointer;text-decoration:none;white-space:nowrap}
                .link{color:#fff!important;background:${THEME.accent};box-shadow:0 4px 14px rgba(193,31,43,.3);transition:background .2s,transform .2s,box-shadow .2s}
                .link:hover{background:${THEME.accentHover};transform:translateY(-1px);box-shadow:0 6px 20px rgba(193,31,43,.45);color:#fff!important}
                .link svg{width:13px;height:13px;fill:currentColor}
                .back{color:${THEME.textMuted}!important;background:transparent;border-color:${THEME.border};transition:color .2s,border-color .2s,background .2s}
                .back:hover{color:#fff!important;border-color:${THEME.accent};background:rgba(193,31,43,.12)}
                .back svg{width:13px;height:13px;fill:currentColor}
                @media(max-width:640px){
                    .header{padding:16px 16px 14px;gap:12px}
                    .name{font-size:16px!important}
                    .rank{width:46px;height:46px;font-size:20px!important}
                    .body{padding:16px 16px 18px}
                    .quote{font-size:14px!important;max-height:280px}
                    .footer{padding:12px 16px 16px;flex-direction:column;align-items:stretch}
                    .footer-actions{flex-direction:column;align-items:stretch;width:100%}
                    .link,.back{width:100%}
                }
            `;

            const SKELETON_CSS = SHARED_CSS + `
                .card{background:${THEME.card};border:1px solid ${THEME.border};border-radius:18px;overflow:hidden;box-shadow:0 12px 48px rgba(0,0,0,.6);width:100%}
                @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
                .sk-line,.sk-rank,.sk-date,.sk-btn{background:linear-gradient(90deg,${THEME.border} 0%,#2a2a38 50%,${THEME.border} 100%);background-size:200% 100%;animation:shimmer 1.4s ease-in-out infinite}
                .sk-header{display:flex;align-items:center;gap:14px;padding:20px 24px 16px;border-bottom:1px solid ${THEME.border};background:${THEME.bg}}
                .sk-info{display:flex;flex-direction:column;gap:8px;flex:1;min-width:0}
                .sk-line{border-radius:6px}
                .sk-name{height:18px;width:100px}
                .sk-status{height:11px;width:140px;opacity:.7}
                .sk-rank{width:54px;height:54px;flex-shrink:0;clip-path:polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)}
                .sk-body{padding:20px 24px 22px;display:flex;flex-direction:column;gap:10px}
                .sk-text{height:12px;width:100%}
                .sk-text.short-1{width:92%}
                .sk-text.short-2{width:78%}
                .sk-text.short-3{width:60%}
                .sk-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 24px 18px;border-top:1px solid ${THEME.border};background:${THEME.bg};flex-wrap:wrap}
                .sk-date{height:12px;width:90px;border-radius:6px}
                .sk-btn{height:34px;width:170px;border-radius:10px}
                @media(max-width:640px){
                    .sk-header{padding:16px 16px 14px;gap:12px}
                    .sk-rank{width:46px;height:46px}
                    .sk-body{padding:16px 16px 18px}
                    .sk-footer{padding:12px 16px 16px;flex-direction:column;align-items:stretch}
                    .sk-btn{width:100%}
                }
            `;

            const SUGGEST_CSS = SHARED_CSS + `
                .card{background:${THEME.card};border:1px solid ${THEME.border};border-radius:18px;overflow:hidden;line-height:1.6;box-shadow:0 12px 48px rgba(0,0,0,.6);width:100%;animation:fadeIn .4s ease-out}
                @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
                .header{display:flex;align-items:center;gap:14px;padding:20px 24px 16px;border-bottom:1px solid ${THEME.border};background:${THEME.bg}}
                .info{display:flex;flex-direction:column;gap:3px;min-width:0;flex:1}
                .name{font-family:${FONT_TITLE}!important;font-weight:700!important;font-size:17px!important;letter-spacing:.8px!important;color:#fff!important;line-height:1.2!important;text-shadow:0 1px 4px rgba(0,0,0,.6)}
                .status{font-family:${FONT_TITLE}!important;font-weight:700!important;font-size:11.5px!important;letter-spacing:1px!important;text-transform:uppercase!important;color:${THEME.textMuted}!important;line-height:1!important}
                .body{padding:20px 24px 22px;display:flex;flex-direction:column;gap:14px;overflow:hidden}
                .text{font-family:${FONT}!important;font-size:15px!important;font-weight:400!important;font-style:normal!important;line-height:1.6!important;letter-spacing:normal!important;color:${THEME.text}!important;word-break:break-word}
                .text strong{color:#fff!important;font-weight:600!important}
                .search{position:relative;width:100%}
                .search-input{width:100%;padding:12px 16px 12px 42px;background:${THEME.bg};border:1px solid ${THEME.border};border-radius:12px;color:${THEME.text}!important;font-family:${FONT}!important;font-size:14.5px!important;font-weight:400!important;line-height:1.4!important;letter-spacing:normal!important;outline:none;transition:border-color .2s,box-shadow .2s}
                .search-input::placeholder{color:${THEME.textMuted};opacity:.7}
                .search-input:focus{border-color:${THEME.accent};box-shadow:0 0 0 3px rgba(193,31,43,.18)}
                .search-icon{position:absolute;left:14px;top:50%;transform:translateY(-50%);width:16px;height:16px;fill:${THEME.textMuted};pointer-events:none;opacity:.7}
                .list{display:flex;flex-direction:column;gap:8px;max-height:320px;overflow-y:auto;padding-right:4px;scrollbar-width:thin;scrollbar-color:${THEME.accent} ${THEME.border}}
                .list::-webkit-scrollbar{width:6px}
                .list::-webkit-scrollbar-track{background:${THEME.border};border-radius:3px}
                .list::-webkit-scrollbar-thumb{background:${THEME.accent};border-radius:3px}
                .item{display:flex;align-items:center;gap:14px;padding:12px 16px;background:${THEME.bg};border:1px solid ${THEME.border};border-radius:12px;cursor:pointer;transition:background .2s,border-color .2s,transform .2s;user-select:none;width:100%}
                .item:hover{background:rgba(193,31,43,.12);border-color:${THEME.accent};transform:translateY(-1px)}
                .item-title{flex:1;font-family:${FONT}!important;font-size:15px!important;font-weight:600!important;line-height:1.4!important;letter-spacing:normal!important;color:${THEME.text}!important;min-width:0;word-break:break-word}
                .item-rank{display:inline-flex;align-items:center;justify-content:center;font-family:${FONT_TITLE}!important;font-size:15px!important;font-weight:900!important;color:#fff!important;width:34px;height:34px;letter-spacing:normal!important;text-shadow:0 2px 8px rgba(0,0,0,.7);clip-path:polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);position:relative;flex-shrink:0}
                .item-rank::before,.item-rank::after{content:'';position:absolute;clip-path:polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);z-index:1}
                .item-rank::before{inset:3px;background:rgba(16,16,21,.9)}
                .item-rank::after{inset:5px;background:rgba(16,16,21,.98)}
                .item-rank>span{position:relative;z-index:3;line-height:1;font-family:${FONT_TITLE}!important;font-weight:900!important;color:#fff!important}
                .item-rank.rank-10{background:linear-gradient(135deg,#c11f2b,#6a0f17)}
                .item-rank.rank-9{background:linear-gradient(135deg,#c11f2b,#8a1520)}
                .item-rank.rank-8{background:linear-gradient(135deg,#8a1520,#4a0a10)}
                .item-rank.rank-7{background:linear-gradient(135deg,#5a3a7a,#2a1a3a)}
                .item-rank.rank-6{background:linear-gradient(135deg,#2a4a5a,#152530)}
                .item-rank.rank-5{background:linear-gradient(135deg,#3a3a5a,#1a1a2e)}
                .item-rank.rank-4,.item-rank.rank-3,.item-rank.rank-2,.item-rank.rank-1,.item-rank.rank-_{background:linear-gradient(135deg,#2a2a3a,#151520)}
                .empty{padding:20px 16px;text-align:center;color:${THEME.textMuted}!important;font-family:${FONT}!important;font-size:14.5px!important;font-style:italic!important;line-height:1.5!important}
                @media(max-width:640px){.header{padding:16px 16px 14px;gap:12px}.name{font-size:16px!important}.body{padding:16px 16px 18px}}
            `;

            function fetchDatabase() {
                if (DB_CACHE) return Promise.resolve(DB_CACHE);
                if (DB_PROMISE) return DB_PROMISE;
                DB_PROMISE = gmFetchJson(getBaseUrl() + DB_PATH, DB_TIMEOUT_MS)
                    .catch(() => gmFetchJson(MIRROR_BASE + DB_PATH, DB_TIMEOUT_MS))
                    .then(data => { DB_CACHE = data; return data; })
                    .catch(e => { DB_PROMISE = null; throw e; });
                return DB_PROMISE;
            }

            function parseRating(value) {
                if (!value) return null;
                const m = String(value).match(/(\d+)\s*(?:\/\s*10)?/);
                if (!m) return null;
                const n = parseInt(m[1], 10);
                if (isNaN(n) || n < 1 || n > 10) return null;
                return n;
            }

            function getKinopoiskTitle() {
                const candidates = ['h1[data-tid="f22e0093"]', '[data-tid="f22e0093"]', 'h1[class*="styles_title"]', 'h1'];
                for (const sel of candidates) {
                    const el = document.querySelector(sel);
                    if (el && el.textContent.trim()) return el.textContent.trim().replace(/\s*\(\d{4}\)\s*$/, '').trim();
                }
                const og = document.querySelector('meta[property="og:title"]');
                if (og) {
                    const t = og.content.replace(/\s*\(\d{4}\)\s*$/, '').replace(/\s*—\s*Кинопоиск.*$/, '').trim();
                    if (t) return t;
                }
                return document.title.replace(/\s*\(\d{4}\)\s*.*$/, '').replace(/\s*—\s*Кинопоиск.*$/, '').trim();
            }

            function createShadowHost(id, css, htmlContent) {
                const host = document.createElement('div');
                host.id = id;
                host.style.cssText = 'all:initial!important;display:block!important;width:100%!important;position:static!important';
                const shadow = host.attachShadow({ mode: 'open' });
                const style = document.createElement('style');
                style.textContent = css;
                shadow.appendChild(style);
                const wrapper = document.createElement('div');
                wrapper.innerHTML = htmlContent;
                while (wrapper.firstChild) shadow.appendChild(wrapper.firstChild);
                return { host, shadow };
            }

            function blockHtml(item, onBack) {
                const hasReview = item.review && String(item.review).trim() !== '';
                const ratingNum = parseRating(item.rating);
                const hasRating = ratingNum !== null;
                let statusText;
                if (!hasReview && !hasRating) statusText = 'В планах';
                else if (hasReview && hasRating) statusText = 'Отзыв и оценка';
                else if (hasReview) statusText = 'Отзыв';
                else statusText = 'Оценка';

                const rankHtml = hasRating ? `<div class="rank rank-${ratingNum}"><span>${ratingNum}</span></div>` : '';
                const bodyHtml = hasReview ? `<div class="body"><div class="quote">${escapeHtml(item.review)}</div></div>` : '';
                const dateHtml = item.date && String(item.date).trim() !== ''
                    ? `<div class="date"><svg viewBox="0 0 24 24"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/></svg>${escapeHtml(item.date)}</div>`
                    : '<div></div>';
                const reviewUrl = getPageUrl('/movies.html') + '?movie=' + encodeURIComponent(item.slug || item.title);
                const backBtnHtml = onBack
                    ? `<button class="back" type="button"><svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>Это не то</button>`
                    : '';

                return `<div class="card"><div class="header"><div class="info"><div class="name">RIPSITE</div><div class="status">${statusText}</div></div>${rankHtml}</div>${bodyHtml}<div class="footer">${dateHtml}<div class="footer-actions">${backBtnHtml}<a class="link" href="${reviewUrl}" target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 24 24"><path d="M14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7zM19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7z"/></svg>Открыть на RIPSITE</a></div></div></div>`;
            }

            function skeletonHtml() {
                return `<div class="card"><div class="sk-header"><div class="sk-info"><div class="sk-line sk-name"></div><div class="sk-line sk-status"></div></div><div class="sk-rank"></div></div><div class="sk-body"><div class="sk-line sk-text"></div><div class="sk-line sk-text short-1"></div><div class="sk-line sk-text short-2"></div><div class="sk-line sk-text short-3"></div></div><div class="sk-footer"><div class="sk-date"></div><div class="sk-btn"></div></div></div>`;
            }

            function suggestHtml(kpTitle, initialSuggestions) {
                const itemsHtml = initialSuggestions.length === 0
                    ? '<div class="empty">Ничего не найдено. Попробуйте другой запрос.</div>'
                    : initialSuggestions.map((item, i) => {
                        const ratingNum = parseRating(item.rating);
                        const rankClass = ratingNum ? `rank-${ratingNum}` : 'rank-_';
                        const rankDisplay = ratingNum ? String(ratingNum) : '?';
                        return `<div class="item" data-index="${i}"><div class="item-title">${escapeHtml(item.title)}</div><div class="item-rank ${rankClass}"><span>${rankDisplay}</span></div></div>`;
                    }).join('');

                return `<div class="card"><div class="header"><div class="info"><div class="name">RIPSITE</div><div class="status">Выбор фильма</div></div></div><div class="body"><div class="text">Точного совпадения для <strong>«${escapeHtml(kpTitle)}»</strong> нет. Возможно, на сайте фильм называется по-другому. Выберите вариант из списка или найдите через поиск.</div><div class="search"><svg class="search-icon" viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg><input type="text" class="search-input" placeholder="Поиск фильма на сайте..."></div><div class="list">${itemsHtml}</div></div></div>`;
            }

            function findInsertTarget() {
                const seriesRoot = document.querySelector('.styles_rootDark__PBX3x');
                if (seriesRoot && seriesRoot.parentNode) return seriesRoot.parentNode;
                const filmRoot = document.querySelector('.styles_root__4qj_T.styles_withBottomBorder__V0q3x');
                if (filmRoot && filmRoot.parentNode) return filmRoot.parentNode;
                const col = document.querySelector('[data-tid="893da4ad"]');
                if (col && col.parentNode) return col.parentNode;
                const ad = document.getElementById('foxadmovie_carousel_desktop');
                if (ad && ad.parentNode) return ad.parentNode;
                const h1 = document.querySelector('h1');
                if (h1 && h1.parentNode) return h1.parentNode;
                return null;
            }

            function insertHost(host) {
                const seriesRoot = document.querySelector('.styles_rootDark__PBX3x');
                if (seriesRoot && seriesRoot.parentNode) {
                    if (host.parentNode === seriesRoot.parentNode && host.previousSibling === seriesRoot) return true;
                    if (host.parentNode) host.parentNode.removeChild(host);
                    seriesRoot.parentNode.insertBefore(host, seriesRoot.nextSibling);
                    return true;
                }
                const filmRoot = document.querySelector('.styles_root__4qj_T.styles_withBottomBorder__V0q3x');
                if (filmRoot && filmRoot.parentNode) {
                    if (host.parentNode === filmRoot.parentNode && host.previousSibling === filmRoot) return true;
                    if (host.parentNode) host.parentNode.removeChild(host);
                    filmRoot.parentNode.insertBefore(host, filmRoot.nextSibling);
                    return true;
                }
                const target = findInsertTarget();
                if (!target) return false;
                if (host.parentNode === target) return true;
                if (host.parentNode) host.parentNode.removeChild(host);
                target.appendChild(host);
                return true;
            }

            function removeAllHosts() {
                Object.values(HOST_IDS).forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.remove();
                });
            }

            function renderSkeleton() {
                removeAllHosts();
                const { host } = createShadowHost(HOST_IDS.skeleton, SKELETON_CSS, skeletonHtml());
                return insertHost(host);
            }

            function renderBlock(item, onBack) {
                removeAllHosts();
                const { host, shadow } = createShadowHost(HOST_IDS.block, CARD_CSS, blockHtml(item, !!onBack));
                if (!insertHost(host)) return false;
                if (onBack) {
                    const backBtn = shadow.querySelector('.back');
                    if (backBtn) backBtn.addEventListener('click', onBack);
                }
                return true;
            }

            function renderSuggest(kpTitle, suggestions, db, onPick) {
                removeAllHosts();
                const { host, shadow } = createShadowHost(HOST_IDS.suggest, SUGGEST_CSS, suggestHtml(kpTitle, suggestions));
                if (!insertHost(host)) return false;

                const listEl = shadow.querySelector('.list');
                const searchInput = shadow.querySelector('.search-input');

                function bindItems(items) {
                    listEl.querySelectorAll('.item').forEach(el => {
                        el.addEventListener('click', () => {
                            const idx = parseInt(el.getAttribute('data-index'), 10);
                            const picked = items[idx];
                            if (picked) onPick(picked);
                        });
                    });
                }

                function renderList(items) {
                    if (items.length === 0) { listEl.innerHTML = '<div class="empty">Ничего не найдено. Попробуйте другой запрос.</div>'; return; }
                    listEl.innerHTML = items.map((item, i) => {
                        const ratingNum = parseRating(item.rating);
                        const rankClass = ratingNum ? `rank-${ratingNum}` : 'rank-_';
                        const rankDisplay = ratingNum ? String(ratingNum) : '?';
                        return `<div class="item" data-index="${i}"><div class="item-title">${escapeHtml(item.title)}</div><div class="item-rank ${rankClass}"><span>${rankDisplay}</span></div></div>`;
                    }).join('');
                    bindItems(items);
                }

                bindItems(suggestions);
                searchInput.addEventListener('input', () => {
                    const q = searchInput.value.trim();
                    if (!q) { renderList(suggestions); return; }
                    renderList(filterByQuery(q, db));
                });
                return true;
            }

            async function build() {
                const title = getKinopoiskTitle();
                if (!title) return false;
                CURRENT_TITLE = title;
                if (!renderSkeleton()) return false;

                try {
                    const db = await fetchDatabase();
                    if (!document.getElementById(HOST_IDS.skeleton)) return false;

                    function showSuggest() {
                        const suggestions = findSuggestions(title, db);
                        renderSuggest(title, suggestions, db, picked => renderBlock(picked, showSuggest));
                    }

                    let exact = null;
                    const norm = normalizeTitle(title);
                    for (const g of db) {
                        if (normalizeTitle(g.title) === norm) { exact = g; break; }
                    }
                    if (exact) renderBlock(exact, null);
                    else showSuggest();
                    return true;
                } catch (e) {
                    console.warn('RIPMORE Kinopoisk:', e);
                    removeAllHosts();
                    return false;
                }
            }

            let scheduled = false;
            function schedule() {
                if (scheduled) return;
                scheduled = true;
                setTimeout(() => { scheduled = false; runCheck(); }, 200);
            }

            async function runCheck() {
                const title = getKinopoiskTitle();
                if (!title) return;
                const existing = document.getElementById(HOST_IDS.block) || document.getElementById(HOST_IDS.suggest) || document.getElementById(HOST_IDS.skeleton);
                if (existing && title === CURRENT_TITLE) return;
                await build();
            }

            function startObserving() {
                new MutationObserver(() => {
                    const title = getKinopoiskTitle();
                    if (!title) return;
                    const existing = document.getElementById(HOST_IDS.block) || document.getElementById(HOST_IDS.suggest) || document.getElementById(HOST_IDS.skeleton);
                    if (existing && title === CURRENT_TITLE) return;
                    schedule();
                }).observe(document.documentElement, { childList: true, subtree: true });
            }

            let booted = false;
            function boot() {
                if (booted) return;
                booted = true;
                startObserving();
                runCheck();
            }

            if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
            else boot();

            let lastUrl = location.href;
            setInterval(() => {
                if (location.href !== lastUrl) {
                    lastUrl = location.href;
                    CURRENT_TITLE = '';
                    removeAllHosts();
                    setTimeout(runCheck, 300);
                    setTimeout(runCheck, 1000);
                    setTimeout(runCheck, 2500);
                }
            }, 500);
        })();
    }

    if (IS_ANIVOX && isEnabled('anivox_review') && isSiteInfoEnabled()) {
        (function initAnivox() {
            const DB_PATH = '/BD/anime_database.json';
            const HOST_IDS = {
                block: 'ripper-anivox-block-host',
                skeleton: 'ripper-anivox-skeleton-host',
                suggest: 'ripper-anivox-suggest-host'
            };
            let DB_CACHE = null;
            let DB_PROMISE = null;
            let CURRENT_TITLE = '';
            let CURRENT_URL = '';
            let IS_BUILDING = false;
            let OBSERVER_PAUSED = false;
            let BUILD_STARTED_AT = 0;
            const BUILD_MAX_MS = 20000;

            const THEME = {
                bg: '#09090f', card: '#101015', accent: '#c11f2b', accentHover: '#d4232f',
                text: '#e0e0ff', textMuted: '#a0a0cc', border: '#1e1e28'
            };
            const FONT = "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
            const FONT_TITLE = "'Orbitron', 'Inter', system-ui, -apple-system, sans-serif";

            function isAnimePage() { return location.pathname.startsWith('/anime'); }

            const SHARED_CSS = `:host{display:block;width:100%;font-family:${FONT}!important;font-size:15px!important;font-weight:400!important;font-style:normal!important;line-height:1.6!important;letter-spacing:normal!important;text-transform:none!important;text-align:left!important;color:${THEME.text}!important;-webkit-font-smoothing:antialiased!important;-moz-osx-font-smoothing:grayscale!important;text-rendering:optimizeLegibility!important;font-variant-ligatures:none!important}*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;font-family:inherit;font-weight:inherit;font-style:inherit;line-height:inherit;letter-spacing:inherit;text-transform:inherit;text-align:inherit;color:inherit;-webkit-font-smoothing:inherit;-moz-osx-font-smoothing:inherit}`;

            const CARD_CSS = SHARED_CSS + `
                .card{background:${THEME.card};border:1px solid ${THEME.border};border-radius:18px;overflow:hidden;line-height:1.6;box-shadow:0 12px 48px rgba(0,0,0,.6);width:100%;animation:fadeIn .4s ease-out}
                @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
                .header{display:flex;align-items:center;gap:14px;padding:20px 24px 16px;border-bottom:1px solid ${THEME.border};background:${THEME.bg}}
                .info{display:flex;flex-direction:column;gap:3px;min-width:0;flex:1}
                .name{font-family:${FONT_TITLE}!important;font-weight:700!important;font-size:17px!important;letter-spacing:.8px!important;color:#fff!important;line-height:1.2!important;text-shadow:0 1px 4px rgba(0,0,0,.6)}
                .status{font-family:${FONT_TITLE}!important;font-weight:700!important;font-size:11.5px!important;letter-spacing:1px!important;text-transform:uppercase!important;color:${THEME.textMuted}!important;line-height:1!important}
                .rank{display:inline-flex;align-items:center;justify-content:center;font-family:${FONT_TITLE}!important;font-size:24px!important;font-weight:900!important;color:#fff!important;width:54px;height:54px;letter-spacing:normal!important;text-shadow:0 3px 12px rgba(0,0,0,.7);clip-path:polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);position:relative;flex-shrink:0;filter:drop-shadow(0 4px 12px rgba(0,0,0,.5))}
                .rank::before,.rank::after{content:'';position:absolute;clip-path:polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);z-index:1}
                .rank::before{inset:4px;background:rgba(16,16,21,.9)}
                .rank::after{inset:7px;background:rgba(16,16,21,.98)}
                .rank>span{position:relative;z-index:3;line-height:1;font-family:${FONT_TITLE}!important;font-weight:900!important;color:#fff!important}
                .rank.rank-10{background:linear-gradient(135deg,#c11f2b,#6a0f17)}
                .rank.rank-9{background:linear-gradient(135deg,#c11f2b,#8a1520)}
                .rank.rank-8{background:linear-gradient(135deg,#8a1520,#4a0a10)}
                .rank.rank-7{background:linear-gradient(135deg,#5a3a7a,#2a1a3a)}
                .rank.rank-6{background:linear-gradient(135deg,#2a4a5a,#152530)}
                .rank.rank-5{background:linear-gradient(135deg,#3a3a5a,#1a1a2e)}
                .rank.rank-4,.rank.rank-3,.rank.rank-2,.rank.rank-1,.rank.rank-_{background:linear-gradient(135deg,#2a2a3a,#151520)}
                .body{padding:20px 24px 22px;background:${THEME.card}}
                .quote{font-family:${FONT}!important;font-size:15px!important;font-weight:400!important;font-style:normal!important;line-height:1.7!important;letter-spacing:normal!important;color:${THEME.text}!important;white-space:pre-wrap;word-break:break-word;border-left:2px solid rgba(193,31,43,.35);padding-left:14px;max-height:360px;overflow-y:auto;scrollbar-width:thin;scrollbar-color:${THEME.accent} ${THEME.border}}
                .quote::-webkit-scrollbar{width:6px}
                .quote::-webkit-scrollbar-track{background:${THEME.border};border-radius:3px}
                .quote::-webkit-scrollbar-thumb{background:${THEME.accent};border-radius:3px}
                .footer{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 24px 18px;border-top:1px solid ${THEME.border};background:${THEME.bg};flex-wrap:wrap}
                .date{font-family:${FONT}!important;font-size:13px!important;font-weight:400!important;font-style:italic!important;letter-spacing:.3px!important;color:${THEME.textMuted}!important;line-height:1.4!important;display:flex;align-items:center;gap:8px}
                .date svg{width:14px;height:14px;fill:currentColor;opacity:.7}
                .footer-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
                .link,.back{display:inline-flex;align-items:center;justify-content:center;gap:8px;font-family:${FONT_TITLE}!important;font-weight:700!important;font-size:12.5px!important;letter-spacing:1px!important;line-height:1!important;text-transform:uppercase!important;padding:9px 18px;border-radius:10px;border:1px solid transparent;cursor:pointer;text-decoration:none;white-space:nowrap}
                .link{color:#fff!important;background:${THEME.accent};box-shadow:0 4px 14px rgba(193,31,43,.3);transition:background .2s,transform .2s,box-shadow .2s}
                .link:hover{background:${THEME.accentHover};transform:translateY(-1px);box-shadow:0 6px 20px rgba(193,31,43,.45);color:#fff!important}
                .link svg{width:13px;height:13px;fill:currentColor}
                .back{color:${THEME.textMuted}!important;background:transparent;border-color:${THEME.border};transition:color .2s,border-color .2s,background .2s}
                .back:hover{color:#fff!important;border-color:${THEME.accent};background:rgba(193,31,43,.12)}
                .back svg{width:13px;height:13px;fill:currentColor}
                @media(max-width:640px){
                    .header{padding:16px 16px 14px;gap:12px}
                    .name{font-size:16px!important}
                    .rank{width:46px;height:46px;font-size:20px!important}
                    .body{padding:16px 16px 18px}
                    .quote{font-size:14px!important;max-height:280px}
                    .footer{padding:12px 16px 16px;flex-direction:column;align-items:stretch}
                    .footer-actions{flex-direction:column;align-items:stretch;width:100%}
                    .link,.back{width:100%}
                }
            `;

            const SKELETON_CSS = SHARED_CSS + `
                .card{background:${THEME.card};border:1px solid ${THEME.border};border-radius:18px;overflow:hidden;box-shadow:0 12px 48px rgba(0,0,0,.6);width:100%}
                @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
                .sk-line,.sk-rank,.sk-date,.sk-btn{background:linear-gradient(90deg,${THEME.border} 0%,#2a2a38 50%,${THEME.border} 100%);background-size:200% 100%;animation:shimmer 1.4s ease-in-out infinite}
                .sk-header{display:flex;align-items:center;gap:14px;padding:20px 24px 16px;border-bottom:1px solid ${THEME.border};background:${THEME.bg}}
                .sk-info{display:flex;flex-direction:column;gap:8px;flex:1;min-width:0}
                .sk-line{border-radius:6px}
                .sk-name{height:18px;width:100px}
                .sk-status{height:11px;width:140px;opacity:.7}
                .sk-rank{width:54px;height:54px;flex-shrink:0;clip-path:polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)}
                .sk-body{padding:20px 24px 22px;display:flex;flex-direction:column;gap:10px}
                .sk-text{height:12px;width:100%}
                .sk-text.short-1{width:92%}
                .sk-text.short-2{width:78%}
                .sk-text.short-3{width:60%}
                .sk-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 24px 18px;border-top:1px solid ${THEME.border};background:${THEME.bg};flex-wrap:wrap}
                .sk-date{height:12px;width:90px;border-radius:6px}
                .sk-btn{height:34px;width:170px;border-radius:10px}
                @media(max-width:640px){
                    .sk-header{padding:16px 16px 14px;gap:12px}
                    .sk-rank{width:46px;height:46px}
                    .sk-body{padding:16px 16px 18px}
                    .sk-footer{padding:12px 16px 16px;flex-direction:column;align-items:stretch}
                    .sk-btn{width:100%}
                }
            `;

            const SUGGEST_CSS = SHARED_CSS + `
                .card{background:${THEME.card};border:1px solid ${THEME.border};border-radius:18px;overflow:hidden;line-height:1.6;box-shadow:0 12px 48px rgba(0,0,0,.6);width:100%;animation:fadeIn .4s ease-out}
                @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
                .header{display:flex;align-items:center;gap:14px;padding:20px 24px 16px;border-bottom:1px solid ${THEME.border};background:${THEME.bg}}
                .info{display:flex;flex-direction:column;gap:3px;min-width:0;flex:1}
                .name{font-family:${FONT_TITLE}!important;font-weight:700!important;font-size:17px!important;letter-spacing:.8px!important;color:#fff!important;line-height:1.2!important;text-shadow:0 1px 4px rgba(0,0,0,.6)}
                .status{font-family:${FONT_TITLE}!important;font-weight:700!important;font-size:11.5px!important;letter-spacing:1px!important;text-transform:uppercase!important;color:${THEME.textMuted}!important;line-height:1!important}
                .body{padding:20px 24px 22px;display:flex;flex-direction:column;gap:14px;overflow:hidden}
                .text{font-family:${FONT}!important;font-size:15px!important;font-weight:400!important;font-style:normal!important;line-height:1.6!important;letter-spacing:normal!important;color:${THEME.text}!important;word-break:break-word}
                .text strong{color:#fff!important;font-weight:600!important}
                .search{position:relative;width:100%}
                .search-input{width:100%;padding:12px 16px 12px 42px;background:${THEME.bg};border:1px solid ${THEME.border};border-radius:12px;color:${THEME.text}!important;font-family:${FONT}!important;font-size:14.5px!important;font-weight:400!important;line-height:1.4!important;letter-spacing:normal!important;outline:none;transition:border-color .2s,box-shadow .2s}
                .search-input::placeholder{color:${THEME.textMuted};opacity:.7}
                .search-input:focus{border-color:${THEME.accent};box-shadow:0 0 0 3px rgba(193,31,43,.18)}
                .search-icon{position:absolute;left:14px;top:50%;transform:translateY(-50%);width:16px;height:16px;fill:${THEME.textMuted};pointer-events:none;opacity:.7}
                .list{display:flex;flex-direction:column;gap:8px;max-height:320px;overflow-y:auto;padding-right:4px;scrollbar-width:thin;scrollbar-color:${THEME.accent} ${THEME.border}}
                .list::-webkit-scrollbar{width:6px}
                .list::-webkit-scrollbar-track{background:${THEME.border};border-radius:3px}
                .list::-webkit-scrollbar-thumb{background:${THEME.accent};border-radius:3px}
                .item{display:flex;align-items:center;gap:14px;padding:12px 16px;background:${THEME.bg};border:1px solid ${THEME.border};border-radius:12px;cursor:pointer;transition:background .2s,border-color .2s,transform .2s;user-select:none;width:100%}
                .item:hover{background:rgba(193,31,43,.12);border-color:${THEME.accent};transform:translateY(-1px)}
                .item-title{flex:1;font-family:${FONT}!important;font-size:15px!important;font-weight:600!important;line-height:1.4!important;letter-spacing:normal!important;color:${THEME.text}!important;min-width:0;word-break:break-word}
                .item-rank{display:inline-flex;align-items:center;justify-content:center;font-family:${FONT_TITLE}!important;font-size:15px!important;font-weight:900!important;color:#fff!important;width:34px;height:34px;letter-spacing:normal!important;text-shadow:0 2px 8px rgba(0,0,0,.7);clip-path:polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);position:relative;flex-shrink:0}
                .item-rank::before,.item-rank::after{content:'';position:absolute;clip-path:polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);z-index:1}
                .item-rank::before{inset:3px;background:rgba(16,16,21,.9)}
                .item-rank::after{inset:5px;background:rgba(16,16,21,.98)}
                .item-rank>span{position:relative;z-index:3;line-height:1;font-family:${FONT_TITLE}!important;font-weight:900!important;color:#fff!important}
                .item-rank.rank-10{background:linear-gradient(135deg,#c11f2b,#6a0f17)}
                .item-rank.rank-9{background:linear-gradient(135deg,#c11f2b,#8a1520)}
                .item-rank.rank-8{background:linear-gradient(135deg,#8a1520,#4a0a10)}
                .item-rank.rank-7{background:linear-gradient(135deg,#5a3a7a,#2a1a3a)}
                .item-rank.rank-6{background:linear-gradient(135deg,#2a4a5a,#152530)}
                .item-rank.rank-5{background:linear-gradient(135deg,#3a3a5a,#1a1a2e)}
                .item-rank.rank-4,.item-rank.rank-3,.item-rank.rank-2,.item-rank.rank-1,.item-rank.rank-_{background:linear-gradient(135deg,#2a2a3a,#151520)}
                .empty{padding:20px 16px;text-align:center;color:${THEME.textMuted}!important;font-family:${FONT}!important;font-size:14.5px!important;font-style:italic!important;line-height:1.5!important}
                @media(max-width:640px){.header{padding:16px 16px 14px;gap:12px}.name{font-size:16px!important}.body{padding:16px 16px 18px}}
            `;

            function fetchDatabase() {
                if (DB_CACHE) return Promise.resolve(DB_CACHE);
                if (DB_PROMISE) return DB_PROMISE;
                const load = url => gmFetchJson(url, DB_TIMEOUT_MS);
                DB_PROMISE = new Promise((resolve, reject) => {
                    let done = false;
                    const finish = (fn, val) => { if (done) return; done = true; fn(val); };
                    const hardTimer = setTimeout(() => finish(reject, new Error('Hard timeout')), DB_TIMEOUT_MS * 2 + 2000);
                    const base = getBaseUrl();
                    load(base + DB_PATH)
                        .then(data => {
                            if (done) return;
                            if (!data || typeof data !== 'object') return load(MIRROR_BASE + DB_PATH);
                            return data;
                        })
                        .then(data => {
                            if (done) return;
                            clearTimeout(hardTimer);
                            if (!data || typeof data !== 'object') { finish(reject, new Error('Invalid DB')); return; }
                            DB_CACHE = data;
                            finish(resolve, data);
                        })
                        .catch(() => {
                            if (done) return;
                            load(MIRROR_BASE + DB_PATH)
                                .then(data => {
                                    if (done) return;
                                    clearTimeout(hardTimer);
                                    if (!data || typeof data !== 'object') { finish(reject, new Error('Invalid DB')); return; }
                                    DB_CACHE = data;
                                    finish(resolve, data);
                                })
                                .catch(e2 => { if (done) return; clearTimeout(hardTimer); finish(reject, e2); });
                        });
                });
                DB_PROMISE.catch(() => { DB_PROMISE = null; });
                return DB_PROMISE;
            }

            function parseRating(value) {
                if (value == null) return null;
                if (typeof value === 'number') {
                    const n = Math.round(value);
                    return (n >= 1 && n <= 10) ? n : null;
                }
                const m = String(value).match(/(\d+)\s*(?:\/\s*10)?/);
                if (!m) return null;
                const n = parseInt(m[1], 10);
                return (isNaN(n) || n < 1 || n > 10) ? null : n;
            }

            function getAnivoxTitle() {
                const candidates = ['h1.anime__info-title-name', 'h1[class*="anime__info-title"]', 'h1'];
                for (const sel of candidates) {
                    const el = document.querySelector(sel);
                    if (el && el.textContent.trim()) {
                        const div = el.querySelector('div.inline-block');
                        if (div) {
                            let node = el.firstChild;
                            while (node && node.nodeType !== 3) node = node.nextSibling;
                            if (node && node.textContent.trim()) return node.textContent.trim();
                        }
                        return el.textContent.trim().split('\n')[0].trim();
                    }
                }
                return document.title.replace(/\s*—\s*Anivox.*$/, '').replace(/\s*\|.*$/, '').trim();
            }

            function getAllAnime(db) {
                if (!db || typeof db !== 'object') return [];
                const result = [];
                if (Array.isArray(db.streamed)) {
                    for (const item of db.streamed) {
                        if (!item || !item.title) continue;
                        let ratingVal = '_';
                        if (item.rating) {
                            const m = String(item.rating).match(/(\d+)\s*\/\s*10/);
                            if (m) ratingVal = m[1];
                        }
                        result.push({ title: item.title, rating: ratingVal, review: item.review || '', date: item.date || '', slug: item.slug || '' });
                    }
                }
                if (Array.isArray(db.offline)) {
                    for (const item of db.offline) {
                        if (!item || !item.title) continue;
                        let ratingVal = '_';
                        if (item.rating != null) {
                            const n = parseInt(item.rating, 10);
                            if (!isNaN(n) && n >= 1 && n <= 10) ratingVal = String(n);
                        }
                        result.push({ title: item.title, rating: ratingVal, review: item.review || '', date: item.date || '', slug: item.image || '' });
                    }
                }
                if (Array.isArray(db.script_anime)) {
                    for (const item of db.script_anime) {
                        if (!item || !item.title) continue;
                        let ratingVal = '_';
                        if (item.rating != null) {
                            const n = parseInt(item.rating, 10);
                            if (!isNaN(n) && n >= 1 && n <= 10) ratingVal = String(n);
                        }
                        result.push({ title: item.title, rating: ratingVal, review: item.review || '', date: item.date || '', slug: item.slug || '' });
                    }
                }
                return result;
            }

            function createShadowHost(id, css, htmlContent) {
                const host = document.createElement('div');
                host.id = id;
                host.style.cssText = 'all:initial!important;display:block!important;width:100%!important;position:static!important';
                const shadow = host.attachShadow({ mode: 'open' });
                const style = document.createElement('style');
                style.textContent = css;
                shadow.appendChild(style);
                const wrapper = document.createElement('div');
                wrapper.innerHTML = htmlContent;
                while (wrapper.firstChild) shadow.appendChild(wrapper.firstChild);
                return { host, shadow };
            }

            function blockHtml(item, onBack) {
                const hasReview = item.review && String(item.review).trim() !== '';
                const ratingNum = parseRating(item.rating);
                const hasRating = ratingNum !== null;
                let statusText;
                if (!hasReview && !hasRating) statusText = 'В планах';
                else if (hasReview && hasRating) statusText = 'Отзыв и оценка';
                else if (hasReview) statusText = 'Отзыв';
                else statusText = 'Оценка';

                const rankHtml = hasRating ? `<div class="rank rank-${ratingNum}"><span>${ratingNum}</span></div>` : '';
                const bodyHtml = hasReview ? `<div class="body"><div class="quote">${escapeHtml(item.review)}</div></div>` : '';
                const dateHtml = item.date && String(item.date).trim() !== ''
                    ? `<div class="date"><svg viewBox="0 0 24 24"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/></svg>${escapeHtml(item.date)}</div>`
                    : '<div></div>';
                const reviewUrl = getPageUrl('/anime.html') + '?anime=' + encodeURIComponent(item.slug || item.title);
                const backBtnHtml = onBack
                    ? `<button class="back" type="button"><svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>Это не то</button>`
                    : '';

                return `<div class="card"><div class="header"><div class="info"><div class="name">RIPSITE</div><div class="status">${statusText}</div></div>${rankHtml}</div>${bodyHtml}<div class="footer">${dateHtml}<div class="footer-actions">${backBtnHtml}<a class="link" href="${reviewUrl}" target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 24 24"><path d="M14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7zM19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7z"/></svg>Открыть на RIPSITE</a></div></div></div>`;
            }

            function skeletonHtml() {
                return `<div class="card"><div class="sk-header"><div class="sk-info"><div class="sk-line sk-name"></div><div class="sk-line sk-status"></div></div><div class="sk-rank"></div></div><div class="sk-body"><div class="sk-line sk-text"></div><div class="sk-line sk-text short-1"></div><div class="sk-line sk-text short-2"></div><div class="sk-line sk-text short-3"></div></div><div class="sk-footer"><div class="sk-date"></div><div class="sk-btn"></div></div></div>`;
            }

            function errorHtml(text) {
                return `<div class="card"><div class="header"><div class="info"><div class="name">RIPSITE</div><div class="status">Ошибка</div></div></div><div class="body"><div class="text">${escapeHtml(text)}</div></div></div>`;
            }

            function suggestHtml(title, initialSuggestions) {
                const itemsHtml = initialSuggestions.length === 0
                    ? '<div class="empty">Ничего не найдено. Попробуйте другой запрос.</div>'
                    : initialSuggestions.map((item, i) => {
                        const ratingNum = parseRating(item.rating);
                        const rankClass = ratingNum ? `rank-${ratingNum}` : 'rank-_';
                        const rankDisplay = ratingNum ? String(ratingNum) : '?';
                        return `<div class="item" data-index="${i}"><div class="item-title">${escapeHtml(item.title)}</div><div class="item-rank ${rankClass}"><span>${rankDisplay}</span></div></div>`;
                    }).join('');

                return `<div class="card"><div class="header"><div class="info"><div class="name">RIPSITE</div><div class="status">Выбор аниме</div></div></div><div class="body"><div class="text">Точного совпадения для <strong>«${escapeHtml(title)}»</strong> нет. Возможно, на сайте аниме называется по-другому. Выберите вариант из списка или найдите через поиск.</div><div class="search"><svg class="search-icon" viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg><input type="text" class="search-input" placeholder="Поиск аниме на сайте..."></div><div class="list">${itemsHtml}</div></div></div>`;
            }

            function findInsertTarget() { return document.querySelector('.comments_container'); }

            function insertHost(host) {
                const target = findInsertTarget();
                if (!target || !target.parentNode) return false;
                if (host.parentNode) return true;
                target.parentNode.insertBefore(host, target);
                return true;
            }

            function removeAllHosts() {
                Object.values(HOST_IDS).forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.remove();
                });
            }

            function renderSkeleton() {
                removeAllHosts();
                const { host } = createShadowHost(HOST_IDS.skeleton, SKELETON_CSS, skeletonHtml());
                return insertHost(host);
            }

            function renderError(text) {
                removeAllHosts();
                const { host } = createShadowHost(HOST_IDS.skeleton, CARD_CSS, errorHtml(text));
                return insertHost(host);
            }

            function renderBlock(item, onBack) {
                removeAllHosts();
                const { host, shadow } = createShadowHost(HOST_IDS.block, CARD_CSS, blockHtml(item, !!onBack));
                if (!insertHost(host)) return false;
                if (onBack) {
                    const backBtn = shadow.querySelector('.back');
                    if (backBtn) backBtn.addEventListener('click', onBack);
                }
                return true;
            }

            function renderSuggest(title, suggestions, db, onPick) {
                removeAllHosts();
                const { host, shadow } = createShadowHost(HOST_IDS.suggest, SUGGEST_CSS, suggestHtml(title, suggestions));
                if (!insertHost(host)) return false;

                const listEl = shadow.querySelector('.list');
                const searchInput = shadow.querySelector('.search-input');

                function bindItems(items) {
                    listEl.querySelectorAll('.item').forEach(el => {
                        el.addEventListener('click', () => {
                            const idx = parseInt(el.getAttribute('data-index'), 10);
                            const picked = items[idx];
                            if (picked) onPick(picked);
                        });
                    });
                }

                function renderList(items) {
                    if (!items.length) { listEl.innerHTML = '<div class="empty">Ничего не найдено. Попробуйте другой запрос.</div>'; return; }
                    listEl.innerHTML = items.map((item, i) => {
                        const ratingNum = parseRating(item.rating);
                        const rankClass = ratingNum ? `rank-${ratingNum}` : 'rank-_';
                        const rankDisplay = ratingNum ? String(ratingNum) : '?';
                        return `<div class="item" data-index="${i}"><div class="item-title">${escapeHtml(item.title)}</div><div class="item-rank ${rankClass}"><span>${rankDisplay}</span></div></div>`;
                    }).join('');
                    bindItems(items);
                }

                bindItems(suggestions);
                searchInput.addEventListener('input', () => {
                    const q = searchInput.value.trim();
                    if (!q) { renderList(suggestions); return; }
                    renderList(filterByQuery(q, db));
                });
                return true;
            }

            async function build() {
                if (IS_BUILDING) return false;
                if (!isAnimePage()) return false;
                const title = getAnivoxTitle();
                if (!title) return false;
                if (CURRENT_TITLE === title && (document.getElementById(HOST_IDS.block) || document.getElementById(HOST_IDS.suggest) || document.getElementById(HOST_IDS.skeleton))) return true;

                IS_BUILDING = true;
                BUILD_STARTED_AT = Date.now();
                OBSERVER_PAUSED = true;

                try {
                    CURRENT_TITLE = title;
                    CURRENT_URL = location.href;
                    if (!renderSkeleton()) return false;

                    let db;
                    try { db = await fetchDatabase(); }
                    catch (e) {
                        renderError('Не удалось загрузить базу аниме. ' + (e && e.message ? e.message : ''));
                        return false;
                    }

                    if (CURRENT_TITLE !== title) return false;
                    if (!isAnimePage()) return false;
                    if (!document.getElementById(HOST_IDS.skeleton)) return false;

                    const allAnime = getAllAnime(db);

                    function showSuggest() {
                        const suggestions = findSuggestions(title, allAnime);
                        renderSuggest(title, suggestions, allAnime, picked => renderBlock(picked, showSuggest));
                    }

                    let exact = null;
                    const norm = normalizeTitle(title);
                    for (const g of allAnime) {
                        if (normalizeTitle(g.title) === norm) { exact = g; break; }
                    }
                    if (exact) renderBlock(exact, null);
                    else showSuggest();
                    return true;
                } catch (e) {
                    renderError('Ошибка: ' + (e && e.message ? e.message : String(e)));
                    return false;
                } finally {
                    IS_BUILDING = false;
                    setTimeout(() => { OBSERVER_PAUSED = false; }, 500);
                }
            }

            let scheduled = false;
            function schedule() {
                if (scheduled) return;
                scheduled = true;
                setTimeout(() => { scheduled = false; runCheck(); }, 300);
            }

            async function runCheck() {
                if (!isAnimePage()) { removeAllHosts(); CURRENT_TITLE = ''; return; }
                if (IS_BUILDING || OBSERVER_PAUSED) return;
                if (IS_BUILDING && Date.now() - BUILD_STARTED_AT > BUILD_MAX_MS) {
                    IS_BUILDING = false;
                    OBSERVER_PAUSED = false;
                }
                const title = getAnivoxTitle();
                if (!title) return;
                const existing = document.getElementById(HOST_IDS.block) || document.getElementById(HOST_IDS.suggest) || document.getElementById(HOST_IDS.skeleton);
                if (existing && title === CURRENT_TITLE) return;
                await build();
            }

            function onUrlChange() {
                const url = location.href;
                if (url === CURRENT_URL) return;
                const nowAnime = isAnimePage();
                CURRENT_URL = url;
                CURRENT_TITLE = '';
                IS_BUILDING = false;
                OBSERVER_PAUSED = false;
                removeAllHosts();
                if (nowAnime) {
                    setTimeout(runCheck, 300);
                    setTimeout(runCheck, 1000);
                    setTimeout(runCheck, 2500);
                }
            }

            function startObserving() {
                new MutationObserver(() => {
                    if (!isAnimePage()) return;
                    const title = getAnivoxTitle();
                    if (!title) return;
                    const existing = document.getElementById(HOST_IDS.block) || document.getElementById(HOST_IDS.suggest) || document.getElementById(HOST_IDS.skeleton);
                    if (existing && title === CURRENT_TITLE) return;
                    if (OBSERVER_PAUSED || IS_BUILDING) return;
                    schedule();
                }).observe(document.documentElement, { childList: true, subtree: true });
            }

            function watchUrl() {
                let last = location.href;
                setInterval(() => {
                    if (location.href !== last) { last = location.href; onUrlChange(); }
                }, 250);
                window.addEventListener('popstate', onUrlChange);
            }

            let booted = false;
            function boot() {
                if (booted) return;
                booted = true;
                CURRENT_URL = location.href;
                startObserving();
                watchUrl();
                if (isAnimePage()) runCheck();
                setInterval(() => {
                    if (!isAnimePage()) return;
                    if (IS_BUILDING && Date.now() - BUILD_STARTED_AT > BUILD_MAX_MS) {
                        IS_BUILDING = false;
                        OBSERVER_PAUSED = false;
                        const sk = document.getElementById(HOST_IDS.skeleton);
                        if (sk) renderError('Превышено время ожидания загрузки базы. Попробуйте обновить страницу.');
                    }
                }, 5000);
            }

            if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
            else boot();
        })();
    }

    {
        (function initUniversalWidget() {
            const UW_SETTINGS_KEY = 'ripmore_uw_config';
            const UW_UI_ID = 'ripper-uw-ui';
            const UW_PICKER_ID = 'ripper-uw-picker';
            const UW_PREVIEW_ID = 'ripper-uw-preview';
            const UW_HOST_IDS = {
                block: 'ripper-uw-block-host',
                skeleton: 'ripper-uw-skeleton-host',
                suggest: 'ripper-uw-suggest-host'
            };

            const THEME = {
                bg: '#09090f', card: '#101015', accent: '#c11f2b', accentHover: '#d4232f',
                text: '#e0e0ff', textMuted: '#a0a0cc', border: '#1e1e28', success: '#2a7d4f'
            };
            const FONT = "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
            const FONT_TITLE = "'Orbitron', 'Inter', system-ui, -apple-system, sans-serif";

            const TYPE_LABELS = { anime: 'Аниме', movie: 'Фильм', game: 'Игра' };
            const TYPE_DB = { anime: '/BD/anime_database.json', movie: '/BD/movie_database.json', game: '/BD/game_database.json' };

            function readStore() {
                try {
                    const raw = GM_getValue(UW_SETTINGS_KEY, null);
                    if (!raw) return { domains: [], sites: {} };
                    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
                    if (parsed && parsed.sites) return { domains: Array.isArray(parsed.domains) ? parsed.domains : Object.keys(parsed.sites), sites: parsed.sites };
                    if (parsed && parsed.hostname) { const host = normalizeDomain(parsed.hostname); parsed.hostname = host; return { domains: [host], sites: { [host]: parsed } }; }
                    return { domains: [], sites: {} };
                } catch (e) { return { domains: [], sites: {} }; }
            }

            function normalizeDomain(value) {
                return String(value || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/:\d+$/, '').replace(/^www\./, '');
            }
            function getHostname() { return normalizeDomain(location.hostname); }
            function getCurrentSiteConfig() {
                const store = readStore();
                return store.sites[getHostname()] || null;
            }
            function saveConfig(cfg) {
                try {
                    const store = readStore();
                    const host = normalizeDomain(cfg.hostname || getHostname());
                    cfg.hostname = host;
                    if (cfg.titleAliases) delete cfg.titleAliases;
                    cfg.titleTrimLeft = Math.max(0, parseInt(cfg.titleTrimLeft, 10) || 0);
                    cfg.titleTrimRight = Math.max(0, parseInt(cfg.titleTrimRight, 10) || 0);
                    store.sites[host] = cfg;
                    store.domains = [...new Set([...store.domains.map(normalizeDomain).filter(Boolean), host])];
                    GM_setValue(UW_SETTINGS_KEY, JSON.stringify(store));
                } catch (e) { }
            }
            function configMatchesSite(cfg) { return !!cfg && normalizeDomain(cfg.hostname) === getHostname(); }
            function cleanTitle(raw, cfg) {
                return String(raw || '').replace(/\s+/g, ' ').trim();
            }
            function computeTrim(source, target) {
                if (!source || !target) return null;
                const src = String(source);
                const tgt = String(target);
                const idx = src.toLowerCase().indexOf(tgt.toLowerCase());
                if (idx < 0) return null;
                const left = idx;
                const right = src.length - (idx + tgt.length);
                if (left + right >= src.length) return null;
                return { left, right };
            }

            function getTitleFromConfig(cfg) {
                if (!cfg) return '';
                let raw = '';
                if (cfg.titleSource === 'tab') raw = document.title || '';
                else if (cfg.titleSource === 'element' && cfg.titleSelector) {
                    try { const el = document.querySelector(cfg.titleSelector); raw = el ? (el.textContent || '').trim() : ''; } catch (e) { }
                }
                let cleaned = cleanTitle(raw, cfg);

                if (cfg.titleAliases && typeof cfg.titleAliases === 'object' && Object.keys(cfg.titleAliases).length) {
                    const [from, to] = Object.entries(cfg.titleAliases)[0];
                    const normFrom = normalizeTitle(cleaned);
                    if (normFrom === from && to) {
                        const trim = computeTrim(cleaned, to);
                        if (trim) { cfg.titleTrimLeft = trim.left; cfg.titleTrimRight = trim.right; }
                    }
                    delete cfg.titleAliases;
                }

                let left = Math.max(0, parseInt(cfg.titleTrimLeft, 10) || 0);
                let right = Math.max(0, parseInt(cfg.titleTrimRight, 10) || 0);
                if (left + right >= cleaned.length) { left = 0; right = 0; }
                if (left) cleaned = cleaned.slice(left);
                if (right) cleaned = cleaned.slice(0, cleaned.length - right);

                return cleaned.trim();
            }

            function getSelectorPreview(selector) {
                if (!selector) return '';
                try {
                    const el = document.querySelector(selector);
                    if (!el) return '';
                    return (el.textContent || '').trim().slice(0, 80);
                } catch (e) { return ''; }
            }

            function insertWidgetAt(cfg) {
                const el = cfg.insertSelector ? document.querySelector(cfg.insertSelector) : null;
                return el || null;
            }

            function createShadowHost(id, css, htmlContent) {
                const host = document.createElement('div');
                host.id = id;
                host.style.cssText = 'all:initial!important;display:block!important;width:100%!important;position:static!important';
                const shadow = host.attachShadow({ mode: 'open' });
                const style = document.createElement('style');
                style.textContent = css;
                shadow.appendChild(style);
                const wrapper = document.createElement('div');
                wrapper.innerHTML = htmlContent;
                while (wrapper.firstChild) shadow.appendChild(wrapper.firstChild);
                return { host, shadow };
            }

            const UW_SHARED_CSS = `:host{display:block;width:100%;font-family:${FONT}!important;font-size:15px!important;font-weight:400!important;line-height:1.6!important;color:${THEME.text}!important;-webkit-font-smoothing:antialiased!important}*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;font-family:inherit;font-weight:inherit;font-style:inherit;line-height:inherit;color:inherit}`;

            const UW_CARD_CSS = UW_SHARED_CSS + `
                .card{background:${THEME.card};border:1px solid ${THEME.border};border-radius:18px;overflow:hidden;line-height:1.6;box-shadow:0 12px 48px rgba(0,0,0,.6);width:100%;animation:uwFade .4s ease-out}
                @keyframes uwFade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
                .header{display:flex;align-items:center;gap:14px;padding:20px 24px 16px;border-bottom:1px solid ${THEME.border};background:${THEME.bg}}
                .info{display:flex;flex-direction:column;gap:3px;min-width:0;flex:1}
                .name{font-family:${FONT_TITLE}!important;font-weight:700!important;font-size:17px!important;letter-spacing:.8px!important;color:#fff!important;line-height:1.2!important;text-shadow:0 1px 4px rgba(0,0,0,.6)}
                .status{font-family:${FONT_TITLE}!important;font-weight:700!important;font-size:11.5px!important;letter-spacing:1px!important;text-transform:uppercase!important;color:${THEME.textMuted}!important;line-height:1!important}
                .rank{display:inline-flex;align-items:center;justify-content:center;font-family:${FONT_TITLE}!important;font-size:24px!important;font-weight:900!important;color:#fff!important;width:54px;height:54px;letter-spacing:normal!important;text-shadow:0 3px 12px rgba(0,0,0,.7);clip-path:polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);position:relative;flex-shrink:0;filter:drop-shadow(0 4px 12px rgba(0,0,0,.5))}
                .rank::before,.rank::after{content:'';position:absolute;clip-path:polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);z-index:1}
                .rank::before{inset:4px;background:rgba(16,16,21,.9)}
                .rank::after{inset:7px;background:rgba(16,16,21,.98)}
                .rank>span{position:relative;z-index:3;line-height:1;font-family:${FONT_TITLE}!important;font-weight:900!important;color:#fff!important}
                .rank.rank-10{background:linear-gradient(135deg,#c11f2b,#6a0f17)}
                .rank.rank-9{background:linear-gradient(135deg,#c11f2b,#8a1520)}
                .rank.rank-8{background:linear-gradient(135deg,#8a1520,#4a0a10)}
                .rank.rank-7{background:linear-gradient(135deg,#5a3a7a,#2a1a3a)}
                .rank.rank-6{background:linear-gradient(135deg,#2a4a5a,#152530)}
                .rank.rank-5{background:linear-gradient(135deg,#3a3a5a,#1a1a2e)}
                .rank.rank-4,.rank.rank-3,.rank.rank-2,.rank.rank-1,.rank.rank-_{background:linear-gradient(135deg,#2a2a3a,#151520)}
                .rank.rank-S{background:linear-gradient(135deg,#c11f2b,#6a0f17)}
                .rank.rank-A{background:linear-gradient(135deg,#c11f2b,#8a1520)}
                .rank.rank-B{background:linear-gradient(135deg,#8a1520,#4a0a10)}
                .rank.rank-C{background:linear-gradient(135deg,#5a3a7a,#2a1a3a)}
                .rank.rank-D{background:linear-gradient(135deg,#2a4a5a,#152530)}
                .rank.rank-E{background:linear-gradient(135deg,#3a3a5a,#1a1a2e)}
                .rank.rank-F{background:linear-gradient(135deg,#2a2a3a,#151520)}
                .body{padding:20px 24px 22px;background:${THEME.card}}
                .quote{font-family:${FONT}!important;font-size:15px!important;font-weight:400!important;line-height:1.7!important;color:${THEME.text}!important;white-space:pre-wrap;word-break:break-word;border-left:2px solid rgba(193,31,43,.35);padding-left:14px;max-height:360px;overflow-y:auto;scrollbar-width:thin;scrollbar-color:${THEME.accent} ${THEME.border}}
                .quote::-webkit-scrollbar{width:6px}
                .quote::-webkit-scrollbar-track{background:${THEME.border};border-radius:3px}
                .quote::-webkit-scrollbar-thumb{background:${THEME.accent};border-radius:3px}
                .footer{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 24px 18px;border-top:1px solid ${THEME.border};background:${THEME.bg};flex-wrap:wrap}
                .date{font-family:${FONT}!important;font-size:13px!important;font-weight:400!important;font-style:italic!important;letter-spacing:.3px!important;color:${THEME.textMuted}!important;line-height:1.4!important;display:flex;align-items:center;gap:8px}
                .date svg{width:14px;height:14px;fill:currentColor;opacity:.7}
                .footer-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
                .link,.back{display:inline-flex;align-items:center;justify-content:center;gap:8px;font-family:${FONT_TITLE}!important;font-weight:700!important;font-size:12.5px!important;letter-spacing:1px!important;line-height:1!important;text-transform:uppercase!important;padding:9px 18px;border-radius:10px;border:1px solid transparent;cursor:pointer;text-decoration:none;white-space:nowrap}
                .link{color:#fff!important;background:${THEME.accent};box-shadow:0 4px 14px rgba(193,31,43,.3);transition:background .2s,transform .2s,box-shadow .2s}
                .link:hover{background:${THEME.accentHover};transform:translateY(-1px);box-shadow:0 6px 20px rgba(193,31,43,.45);color:#fff!important}
                .link svg{width:13px;height:13px;fill:currentColor}
                .back{color:${THEME.textMuted}!important;background:transparent;border-color:${THEME.border};transition:color .2s,border-color .2s,background .2s}
                .back:hover{color:#fff!important;border-color:${THEME.accent};background:rgba(193,31,43,.12)}
                .back svg{width:13px;height:13px;fill:currentColor}
                @media(max-width:640px){
                    .header{padding:16px 16px 14px;gap:12px}
                    .name{font-size:16px!important}
                    .rank{width:46px;height:46px;font-size:20px!important}
                    .body{padding:16px 16px 18px}
                    .quote{font-size:14px!important;max-height:280px}
                    .footer{padding:12px 16px 16px;flex-direction:column;align-items:stretch}
                    .footer-actions{flex-direction:column;align-items:stretch;width:100%}
                    .link,.back{width:100%}
                }
            `;

            const UW_SKELETON_CSS = UW_SHARED_CSS + `
                .card{background:${THEME.card};border:1px solid ${THEME.border};border-radius:18px;overflow:hidden;box-shadow:0 12px 48px rgba(0,0,0,.6);width:100%}
                @keyframes uwShimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
                .sk-line,.sk-rank,.sk-date,.sk-btn{background:linear-gradient(90deg,${THEME.border} 0%,#2a2a38 50%,${THEME.border} 100%);background-size:200% 100%;animation:uwShimmer 1.4s ease-in-out infinite}
                .sk-header{display:flex;align-items:center;gap:14px;padding:20px 24px 16px;border-bottom:1px solid ${THEME.border};background:${THEME.bg}}
                .sk-info{display:flex;flex-direction:column;gap:8px;flex:1;min-width:0}
                .sk-line{border-radius:6px}
                .sk-name{height:18px;width:100px}
                .sk-status{height:11px;width:140px;opacity:.7}
                .sk-rank{width:54px;height:54px;flex-shrink:0;clip-path:polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)}
                .sk-body{padding:20px 24px 22px;display:flex;flex-direction:column;gap:10px}
                .sk-text{height:12px;width:100%}
                .sk-text.short-1{width:92%}
                .sk-text.short-2{width:78%}
                .sk-text.short-3{width:60%}
                .sk-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 24px 18px;border-top:1px solid ${THEME.border};background:${THEME.bg};flex-wrap:wrap}
                .sk-date{height:12px;width:90px;border-radius:6px}
                .sk-btn{height:34px;width:170px;border-radius:10px}
                @media(max-width:640px){
                    .sk-header{padding:16px 16px 14px;gap:12px}
                    .sk-rank{width:46px;height:46px}
                    .sk-body{padding:16px 16px 18px}
                    .sk-footer{padding:12px 16px 16px;flex-direction:column;align-items:stretch}
                    .sk-btn{width:100%}
                }
            `;

            const UW_SUGGEST_CSS = UW_SHARED_CSS + `
                .card{background:${THEME.card};border:1px solid ${THEME.border};border-radius:18px;overflow:hidden;line-height:1.6;box-shadow:0 12px 48px rgba(0,0,0,.6);width:100%;animation:uwFade .4s ease-out}
                @keyframes uwFade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
                .header{display:flex;align-items:center;gap:14px;padding:20px 24px 16px;border-bottom:1px solid ${THEME.border};background:${THEME.bg}}
                .info{display:flex;flex-direction:column;gap:3px;min-width:0;flex:1}
                .name{font-family:${FONT_TITLE}!important;font-weight:700!important;font-size:17px!important;letter-spacing:.8px!important;color:#fff!important;line-height:1.2!important;text-shadow:0 1px 4px rgba(0,0,0,.6)}
                .status{font-family:${FONT_TITLE}!important;font-weight:700!important;font-size:11.5px!important;letter-spacing:1px!important;text-transform:uppercase!important;color:${THEME.textMuted}!important;line-height:1!important}
                .body{padding:20px 24px 22px;display:flex;flex-direction:column;gap:14px;overflow:hidden}
                .text{font-family:${FONT}!important;font-size:15px!important;font-weight:400!important;line-height:1.6!important;color:${THEME.text}!important;word-break:break-word}
                .text strong{color:#fff!important;font-weight:600!important}
                .search{position:relative;width:100%}
                .search-input{width:100%;padding:12px 16px 12px 42px;background:${THEME.bg};border:1px solid ${THEME.border};border-radius:12px;color:${THEME.text}!important;font-family:${FONT}!important;font-size:14.5px!important;outline:none;transition:border-color .2s,box-shadow .2s}
                .search-input::placeholder{color:${THEME.textMuted};opacity:.7}
                .search-input:focus{border-color:${THEME.accent};box-shadow:0 0 0 3px rgba(193,31,43,.18)}
                .search-icon{position:absolute;left:14px;top:50%;transform:translateY(-50%);width:16px;height:16px;fill:${THEME.textMuted};pointer-events:none;opacity:.7}
                .list{display:flex;flex-direction:column;gap:8px;max-height:320px;overflow-y:auto;padding-right:4px;scrollbar-width:thin;scrollbar-color:${THEME.accent} ${THEME.border}}
                .list::-webkit-scrollbar{width:6px}
                .list::-webkit-scrollbar-track{background:${THEME.border};border-radius:3px}
                .list::-webkit-scrollbar-thumb{background:${THEME.accent};border-radius:3px}
                .item{display:flex;align-items:center;gap:14px;padding:12px 16px;background:${THEME.bg};border:1px solid ${THEME.border};border-radius:12px;cursor:pointer;transition:background .2s,border-color .2s,transform .2s;user-select:none;width:100%}
                .item:hover{background:rgba(193,31,43,.12);border-color:${THEME.accent};transform:translateY(-1px)}
                .item-title{flex:1;font-family:${FONT}!important;font-size:15px!important;font-weight:600!important;line-height:1.4!important;color:${THEME.text}!important;min-width:0;word-break:break-word}
                .item-rank{display:inline-flex;align-items:center;justify-content:center;font-family:${FONT_TITLE}!important;font-size:15px!important;font-weight:900!important;color:#fff!important;width:34px;height:34px;text-shadow:0 2px 8px rgba(0,0,0,.7);clip-path:polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);position:relative;flex-shrink:0}
                .item-rank::before,.item-rank::after{content:'';position:absolute;clip-path:polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);z-index:1}
                .item-rank::before{inset:3px;background:rgba(16,16,21,.9)}
                .item-rank::after{inset:5px;background:rgba(16,16,21,.98)}
                .item-rank>span{position:relative;z-index:3;line-height:1;font-family:${FONT_TITLE}!important;font-weight:900!important;color:#fff!important}
                .item-rank.rank-10{background:linear-gradient(135deg,#c11f2b,#6a0f17)}
                .item-rank.rank-9{background:linear-gradient(135deg,#c11f2b,#8a1520)}
                .item-rank.rank-8{background:linear-gradient(135deg,#8a1520,#4a0a10)}
                .item-rank.rank-7{background:linear-gradient(135deg,#5a3a7a,#2a1a3a)}
                .item-rank.rank-6{background:linear-gradient(135deg,#2a4a5a,#152530)}
                .item-rank.rank-5{background:linear-gradient(135deg,#3a3a5a,#1a1a2e)}
                .item-rank.rank-4,.item-rank.rank-3,.item-rank.rank-2,.item-rank.rank-1,.item-rank.rank-_{background:linear-gradient(135deg,#2a2a3a,#151520)}
                .item-rank.rank-S{background:linear-gradient(135deg,#c11f2b,#6a0f17)}
                .item-rank.rank-A{background:linear-gradient(135deg,#c11f2b,#8a1520)}
                .item-rank.rank-B{background:linear-gradient(135deg,#8a1520,#4a0a10)}
                .item-rank.rank-C{background:linear-gradient(135deg,#5a3a7a,#2a1a3a)}
                .item-rank.rank-D{background:linear-gradient(135deg,#2a4a5a,#152530)}
                .item-rank.rank-E{background:linear-gradient(135deg,#3a3a5a,#1a1a2e)}
                .item-rank.rank-F{background:linear-gradient(135deg,#2a2a3a,#151520)}
                .empty{padding:20px 16px;text-align:center;color:${THEME.textMuted}!important;font-family:${FONT}!important;font-size:14.5px!important;font-style:italic!important;line-height:1.5!important}
                @media(max-width:640px){.header{padding:16px 16px 14px;gap:12px}.name{font-size:16px!important}.body{padding:16px 16px 18px}}
            `;

            const UW_UI_CSS = `
                #${UW_UI_ID}{position:fixed;z-index:2147483645;font-family:${FONT};font-size:13px;line-height:1.5;color:${THEME.text};-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
                #${UW_UI_ID} *{box-sizing:border-box;font-family:inherit}
                #${UW_UI_ID} .uw-fab{position:fixed;right:18px;bottom:18px;width:52px;height:52px;border-radius:50%;background:${THEME.accent};color:#fff;border:none;cursor:pointer;box-shadow:0 8px 28px rgba(193,31,43,.5),0 4px 12px rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;transition:transform .18s,box-shadow .18s,background .18s;padding:0;line-height:0;overflow:hidden}
                #${UW_UI_ID} .uw-fab:hover{background:${THEME.accentHover};transform:translateY(-2px) scale(1.04);box-shadow:0 12px 32px rgba(193,31,43,.6),0 6px 16px rgba(0,0,0,.55)}
                #${UW_UI_ID} .uw-fab img{width:38px;height:38px;object-fit:cover;border-radius:50%;pointer-events:none;display:block}
                #${UW_UI_ID} .uw-fab.active{background:${THEME.accent}}
                #${UW_UI_ID} .uw-panel{position:fixed;right:18px;bottom:82px;width:min(440px,calc(100vw - 36px));max-height:calc(100vh - 100px);background:${THEME.card};border:1px solid ${THEME.border};border-radius:16px;box-shadow:0 20px 56px rgba(0,0,0,.85),0 0 0 1px rgba(193,31,43,.1);display:none;flex-direction:column;overflow:hidden}
                #${UW_UI_ID} .uw-panel.open{display:flex}
                #${UW_UI_ID} .uw-panel-header{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid ${THEME.border};background:${THEME.bg};flex-shrink:0}
                #${UW_UI_ID} .uw-panel-header img{width:22px;height:22px;border-radius:4px;object-fit:cover}
                #${UW_UI_ID} .uw-panel-title{flex:1;font-family:${FONT_TITLE};font-weight:700;font-size:13.5px;letter-spacing:.6px;color:#fff}
                #${UW_UI_ID} .uw-panel-close{width:26px;height:26px;display:inline-flex;align-items:center;justify-content:center;background:transparent;border:none;border-radius:6px;cursor:pointer;color:${THEME.textMuted};padding:0;transition:background .15s,color .15s}
                #${UW_UI_ID} .uw-panel-close:hover{background:rgba(255,255,255,.08);color:#fff}
                #${UW_UI_ID} .uw-panel-close svg{width:14px;height:14px;fill:currentColor;display:block}
                #${UW_UI_ID} .uw-panel-body{flex:1;min-height:0;overflow-y:auto;padding:14px 16px 16px;display:flex;flex-direction:column;gap:14px;scrollbar-width:thin;scrollbar-color:${THEME.border} transparent}
                #${UW_UI_ID} .uw-panel-body::-webkit-scrollbar{width:6px}
                #${UW_UI_ID} .uw-panel-body::-webkit-scrollbar-thumb{background:${THEME.border};border-radius:3px}
                #${UW_UI_ID} .uw-section{display:flex;flex-direction:column;gap:8px}
                #${UW_UI_ID} .uw-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:${THEME.textMuted}}
                #${UW_UI_ID} .uw-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
                #${UW_UI_ID} .uw-choice{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:8px 14px;background:${THEME.bg};border:1px solid ${THEME.border};border-radius:10px;color:${THEME.text};font-size:12.5px;font-weight:600;cursor:pointer;transition:border-color .15s,background .15s,color .15s,transform .15s;user-select:none}
                #${UW_UI_ID} .uw-choice:hover{border-color:${THEME.accent};background:rgba(193,31,43,.1);transform:translateY(-1px)}
                #${UW_UI_ID} .uw-choice.active{background:${THEME.accent};border-color:${THEME.accent};color:#fff;box-shadow:0 4px 14px rgba(193,31,43,.3)}
                #${UW_UI_ID} .uw-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:9px 16px;background:${THEME.bg};border:1px solid ${THEME.border};border-radius:10px;color:${THEME.text};font-family:${FONT_TITLE};font-size:11.5px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;cursor:pointer;transition:border-color .15s,background .15s,color .15s,transform .15s}
                #${UW_UI_ID} .uw-btn:hover{border-color:${THEME.accent};background:rgba(193,31,43,.1);transform:translateY(-1px)}
                #${UW_UI_ID} .uw-btn-primary{background:${THEME.accent};border-color:${THEME.accent};color:#fff;box-shadow:0 4px 14px rgba(193,31,43,.3)}
                #${UW_UI_ID} .uw-btn-primary:hover{background:${THEME.accentHover};border-color:${THEME.accentHover};color:#fff}
                #${UW_UI_ID} .uw-btn-success{background:${THEME.accent};border-color:${THEME.accent};color:#fff;box-shadow:0 4px 14px rgba(193,31,43,.3)}
                #${UW_UI_ID} .uw-btn-success:hover{background:${THEME.accentHover};border-color:${THEME.accentHover};color:#fff}
                #${UW_UI_ID} .uw-btn-danger{background:transparent;border-color:#7a1f28;color:#e57373}
                #${UW_UI_ID} .uw-btn-danger:hover{background:rgba(193,31,43,.15);border-color:#c11f2b;color:#fff}
                #${UW_UI_ID} .uw-btn:disabled{opacity:.45;cursor:not-allowed;transform:none}
                #${UW_UI_ID} .uw-input{width:100%;padding:10px 12px;background:${THEME.bg};border:1px solid ${THEME.border};border-radius:10px;color:${THEME.text};font-size:12.5px;outline:none;transition:border-color .15s,box-shadow .15s}
                #${UW_UI_ID} .uw-input:focus{border-color:${THEME.accent};box-shadow:0 0 0 3px rgba(193,31,43,.18)}
                #${UW_UI_ID} .uw-hint{font-size:11.5px;color:${THEME.textMuted};line-height:1.5;margin-top:2px}
                #${UW_UI_ID} .uw-hint,
                #${UW_UI_ID} .uw-hint, #${UW_UI_ID} .uw-hint b, #${UW_UI_ID} .uw-hint code{font-size:12px;}
                #${UW_UI_ID} .uw-hint code{background:${THEME.bg};border:1px solid ${THEME.border};border-radius:4px;padding:1px 5px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:10.5px;color:${THEME.text}}
                #${UW_UI_ID} .uw-preview-box{margin-top:6px;padding:12px;border:1px dashed ${THEME.border};border-radius:12px;background:${THEME.bg};min-height:80px;display:flex;align-items:center;justify-content:center;color:${THEME.textMuted};font-style:italic;font-size:12px;text-align:center}
                #${UW_UI_ID} .uw-preview-box.has-content{padding:0;border-style:solid;background:transparent;display:block;min-height:0}
                #${UW_UI_ID} .uw-tag{display:inline-flex;align-items:center;gap:6px;padding:6px 10px;background:${THEME.bg};border:1px solid ${THEME.border};border-radius:8px;font-size:11.5px;color:${THEME.textMuted};max-width:100%;overflow:hidden}
                #${UW_UI_ID} .uw-tag b{color:${THEME.text};font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:260px;display:inline-block}
                #${UW_UI_ID} .uw-tag-clear{background:transparent;border:none;color:${THEME.textMuted};cursor:pointer;padding:0;margin-left:auto;font-size:14px;line-height:1}
                #${UW_UI_ID} .uw-tag-clear:hover{color:#e57373}
                #${UW_UI_ID} .uw-status-badge{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px}
                #${UW_UI_ID} .uw-status-badge.on{background:rgba(42,125,79,.15);color:#5fd08a;border:1px solid rgba(42,125,79,.4)}
                #${UW_UI_ID} .uw-status-badge.off{background:rgba(160,160,204,.08);color:${THEME.textMuted};border:1px solid ${THEME.border}}
                #${UW_UI_ID} .uw-status-dot{width:7px;height:7px;border-radius:50%;background:currentColor}
                #${UW_UI_ID} .uw-divider{height:1px;background:${THEME.border};margin:4px 0}
                #${UW_UI_ID} .uw-rec-list{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}
                #${UW_UI_ID} .uw-rec-btn{padding:5px 10px;background:${THEME.bg};border:1px solid ${THEME.border};border-radius:8px;color:${THEME.textMuted};font-size:11px;font-weight:600;cursor:pointer;transition:border-color .15s,color .15s,background .15s}
                #${UW_UI_ID} .uw-rec-btn:hover{border-color:${THEME.accent};color:#fff;background:rgba(193,31,43,.1)}
                #${UW_UI_ID} .uw-actions-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding-top:4px;border-top:1px solid ${THEME.border};margin-top:4px}
                #${UW_UI_ID} .uw-toast{position:fixed;right:18px;bottom:82px;background:${THEME.card};border:1px solid ${THEME.accent};border-left:3px solid ${THEME.accent};border-radius:10px;padding:10px 14px;color:#fff;font-size:12.5px;box-shadow:0 12px 32px rgba(0,0,0,.7);opacity:0;transform:translateY(10px);transition:opacity .25s,transform .25s;pointer-events:none;max-width:340px}
                #${UW_UI_ID} .uw-toast.show{opacity:1;transform:translateY(0)}
                .ripper-uw-picker-hl{position:fixed!important;pointer-events:none!important;z-index:2147483646!important;background:rgba(193,31,43,.18)!important;border:2px solid #c11f2b!important;border-radius:4px!important;box-shadow:0 0 0 1px rgba(0,0,0,.5),0 0 24px rgba(193,31,43,.5)!important;transition:all .06s ease!important;box-sizing:border-box!important;margin:0!important;padding:0!important}
                .ripper-uw-picker-label{position:fixed!important;pointer-events:none!important;z-index:2147483647!important;background:#c11f2b!important;color:#fff!important;font-family:Inter,system-ui,sans-serif!important;font-size:11px!important;font-weight:700!important;padding:4px 9px!important;border-radius:5px!important;white-space:nowrap!important;box-shadow:0 3px 12px rgba(0,0,0,.7)!important;letter-spacing:.2px!important;line-height:1.3!important}
                .ripper-uw-picker-banner{position:fixed!important;top:14px!important;left:50%!important;transform:translateX(-50%)!important;z-index:2147483647!important;background:#101015!important;border:1px solid #c11f2b!important;border-radius:10px!important;padding:10px 18px!important;color:#e0e0ff!important;font-family:Inter,system-ui,sans-serif!important;font-size:13px!important;font-weight:600!important;box-shadow:0 12px 40px rgba(0,0,0,.8)!important;pointer-events:none!important;white-space:nowrap!important}
                .ripper-uw-picker-banner b{color:#c11f2b!important}
            `;

            function injectUiStyles() {
                if (document.getElementById('ripper-uw-ui-styles')) return;
                const style = document.createElement('style');
                style.id = 'ripper-uw-ui-styles';
                style.textContent = UW_UI_CSS;
                (document.head || document.documentElement).appendChild(style);
            }

            function getUniqueSelector(el) {
                if (!el || el.nodeType !== 1) return '';
                if (el === document.body) return 'body';
                if (el === document.documentElement) return 'html';
                if (el.id && /^[a-zA-Z][\w\-]*$/.test(el.id)) {
                    try { if (document.querySelectorAll('#' + CSS.escape(el.id)).length === 1) return '#' + el.id; } catch (e) { }
                }
                const parts = [];
                let cur = el;
                let depth = 0;
                while (cur && cur.nodeType === 1 && cur !== document.body && depth < 8) {
                    let sel = cur.tagName.toLowerCase();
                    if (cur.id && /^[a-zA-Z][\w\-]*$/.test(cur.id)) {
                        try { if (document.querySelectorAll('#' + CSS.escape(cur.id)).length === 1) { parts.unshift('#' + cur.id); break; } } catch (e) { }
                    }
                    if (cur.className && typeof cur.className === 'string') {
                        const classes = cur.className.trim().split(/\s+/).filter(c => /^[a-zA-Z_][\w\-]*$/.test(c) && c.length < 40).slice(0, 2);
                        if (classes.length) sel += '.' + classes.join('.');
                    }
                    const parent = cur.parentElement;
                    if (parent) {
                        const siblings = [...parent.children].filter(c => c.tagName === cur.tagName);
                        if (siblings.length > 1) sel += ':nth-of-type(' + (siblings.indexOf(cur) + 1) + ')';
                    }
                    parts.unshift(sel);
                    cur = cur.parentElement;
                    depth++;
                }
                let result = parts.join(' > ');
                try {
                    if (document.querySelectorAll(result).length > 1) return result;
                    if (document.querySelectorAll(result).length === 1) return result;
                } catch (e) { }
                return result;
            }

            function startPicker(opts, onPick, onCancel) {
                opts = opts || {};
                const hl = document.createElement('div');
                hl.className = 'ripper-uw-picker-hl';
                document.body.appendChild(hl);
                const label = document.createElement('div');
                label.className = 'ripper-uw-picker-label';
                document.body.appendChild(label);
                const banner = document.createElement('div');
                banner.className = 'ripper-uw-picker-banner';
                banner.innerHTML = opts.banner || 'Выберите элемент на странице. <b>Esc</b> — отмена';
                document.body.appendChild(banner);
                const prevCursor = document.body.style.cursor;
                document.body.style.cursor = 'crosshair';
                let current = null;
                let done = false;
                const excluded = '#' + UW_UI_ID + ',.ripper-uw-picker-hl,.ripper-uw-picker-label,.ripper-uw-picker-banner';

                function cleanup() {
                    if (done) return;
                    done = true;
                    try { hl.remove(); } catch (e) { }
                    try { label.remove(); } catch (e) { }
                    try { banner.remove(); } catch (e) { }
                    document.body.style.cursor = prevCursor;
                    document.removeEventListener('mousemove', onMove, true);
                    document.removeEventListener('click', onClick, true);
                    document.removeEventListener('keydown', onKey, true);
                    document.removeEventListener('scroll', onScroll, true);
                }

                function updateBox(el) {
                    if (!el) return;
                    const r = el.getBoundingClientRect();
                    hl.style.left = r.left + 'px';
                    hl.style.top = r.top + 'px';
                    hl.style.width = r.width + 'px';
                    hl.style.height = r.height + 'px';
                    let name = el.tagName.toLowerCase();
                    if (el.id) name += '#' + el.id;
                    else if (el.className && typeof el.className === 'string') {
                        const c = el.className.trim().split(/\s+/).filter(x => /^[a-zA-Z_]/.test(x)).slice(0, 2);
                        if (c.length) name += '.' + c.join('.');
                    }
                    label.textContent = name;
                    let lx = r.left;
                    let ly = r.top - 28;
                    if (ly < 4) ly = r.bottom + 6;
                    if (lx < 4) lx = 4;
                    const lw = label.offsetWidth || 120;
                    if (lx + lw > window.innerWidth - 4) lx = window.innerWidth - lw - 4;
                    label.style.left = lx + 'px';
                    label.style.top = ly + 'px';
                }

                function onMove(e) {
                    if (done) return;
                    const el = document.elementFromPoint(e.clientX, e.clientY);
                    if (!el || el.closest(excluded)) return;
                    if (opts.filter && !opts.filter(el)) return;
                    current = el;
                    updateBox(el);
                }

                function onScroll() {
                    if (current && current.isConnected) updateBox(current);
                }

                function onClick(e) {
                    if (done) return;
                    if (e.target.closest(excluded)) return;
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    if (opts.filter && !opts.filter(e.target)) return;
                    const sel = getUniqueSelector(current || e.target);
                    cleanup();
                    if (onPick) onPick(sel, current || e.target);
                }

                function onKey(e) {
                    if (e.key === 'Escape') {
                        e.preventDefault();
                        e.stopPropagation();
                        cleanup();
                        if (onCancel) onCancel();
                    }
                }

                document.addEventListener('mousemove', onMove, true);
                document.addEventListener('click', onClick, true);
                document.addEventListener('keydown', onKey, true);
                document.addEventListener('scroll', onScroll, true);
            }

            function getAllItemsByType(db, type) {
                if (!db || typeof db !== 'object') return [];
                if (type === 'game') {
                    if (!Array.isArray(db)) return [];
                    return db.map(it => ({
                        title: it.title,
                        rating: it.rang && it.rang !== '_' ? it.rang : '_',
                        review: it.comment || '',
                        date: it.date || '',
                        slug: it.slug || it.title
                    }));
                }
                const result = [];
                const pushItem = (it, ratingKey) => {
                    if (!it || !it.title) return;
                    let r = '_';
                    if (ratingKey && it[ratingKey] != null) {
                        const raw = String(it[ratingKey]);
                        const m = raw.match(/(\d+)/);
                        if (m) {
                            const n = parseInt(m[1], 10);
                            if (n >= 1 && n <= 10) r = String(n);
                        }
                    }
                    result.push({ title: it.title, rating: r, review: it.review || it.comment || '', date: it.date || '', slug: it.slug || it.image || it.title });
                };
                if (Array.isArray(db.script_anime)) db.script_anime.forEach(it => pushItem(it, 'rating'));
                if (Array.isArray(db.offline)) db.offline.forEach(it => pushItem(it, 'rating'));
                if (Array.isArray(db.streamed)) db.streamed.forEach(it => pushItem(it, 'rating'));
                if (Array.isArray(db)) db.forEach(it => pushItem(it, 'rating'));
                return result;
            }

            function fetchDbForType(type) {
                const path = TYPE_DB[type];
                if (!path) return Promise.resolve(null);
                return gmFetchJson(getBaseUrl() + path, DB_TIMEOUT_MS)
                    .catch(() => gmFetchJson(MIRROR_BASE + path, DB_TIMEOUT_MS));
            }

            function parseRatingNum(value) {
                if (value == null) return null;
                const m = String(value).match(/(\d+)/);
                if (!m) return null;
                const n = parseInt(m[1], 10);
                if (isNaN(n) || n < 1 || n > 10) return null;
                return n;
            }

            function blockHtmlUW(item, type, onBack) {
                const hasReview = item.review && String(item.review).trim() !== '';
                let rankVal = item.rating;
                let hasRank = false;
                let rankClass = '';
                let rankDisplay = '';
                if (rankVal != null && String(rankVal).trim() !== '' && String(rankVal).trim() !== '_') {
                    const raw = String(rankVal).trim();
                    const n = parseRatingNum(raw);
                    if (n !== null) {
                        hasRank = true;
                        rankClass = 'rank-' + n;
                        rankDisplay = String(n);
                    } else if (/^[A-Za-zА-Яа-я]$/.test(raw)) {
                        hasRank = true;
                        rankClass = 'rank-' + raw.toUpperCase();
                        rankDisplay = raw.toUpperCase();
                    }
                }
                const isPlanned = !hasRank && !hasReview;
                let statusText;
                if (isPlanned) statusText = 'В планах';
                else if (hasReview && hasRank) statusText = 'Отзыв и оценка';
                else if (hasReview) statusText = 'Отзыв';
                else statusText = 'Оценка';

                const rankHtml = hasRank ? `<div class="rank ${rankClass}"><span>${rankDisplay}</span></div>` : '';
                const bodyHtml = hasReview && !isPlanned ? `<div class="body"><div class="quote">${escapeHtml(item.review)}</div></div>` : '';
                const dateHtml = item.date && String(item.date).trim() !== ''
                    ? `<div class="date"><svg viewBox="0 0 24 24"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/></svg>${escapeHtml(item.date)}</div>`
                    : '<div></div>';
                const pageMap = { anime: '/anime.html?anime=', movie: '/movies.html?movie=', game: '/games.html?game=' };
                const reviewUrl = getPageUrl(pageMap[type] || '/') + encodeURIComponent(item.slug || item.title);
                const backBtnHtml = onBack
                    ? `<button class="back" type="button"><svg viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>Это не то</button>`
                    : '';
                return `<div class="card"><div class="header"><div class="info"><div class="name">RIPSITE</div><div class="status">${statusText}</div></div>${rankHtml}</div>${bodyHtml}<div class="footer">${dateHtml}<div class="footer-actions">${backBtnHtml}<a class="link" href="${reviewUrl}" target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 24 24"><path d="M14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7zM19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7z"/></svg>Открыть на RIPSITE</a></div></div></div>`;
            }

            function skeletonHtmlUW() {
                return `<div class="card"><div class="sk-header"><div class="sk-info"><div class="sk-line sk-name"></div><div class="sk-line sk-status"></div></div><div class="sk-rank"></div></div><div class="sk-body"><div class="sk-line sk-text"></div><div class="sk-line sk-text short-1"></div><div class="sk-line sk-text short-2"></div><div class="sk-line sk-text short-3"></div></div><div class="sk-footer"><div class="sk-date"></div><div class="sk-btn"></div></div></div>`;
            }

            function suggestHtmlUW(title, items, type) {
                const itemsHtml = items.length === 0
                    ? '<div class="empty">Ничего не найдено. Попробуйте другой запрос.</div>'
                    : items.map((it, i) => {
                        let rankClass = 'rank-_';
                        let rankDisplay = '?';
                        if (type === 'game') {
                            if (it.rating && it.rating !== '_') { rankClass = 'rank-' + it.rating; rankDisplay = it.rating; }
                        } else {
                            const n = parseRatingNum(it.rating);
                            if (n !== null) { rankClass = 'rank-' + n; rankDisplay = String(n); }
                        }
                        return `<div class="item" data-index="${i}"><div class="item-title">${escapeHtml(it.title)}</div><div class="item-rank ${rankClass}"><span>${rankDisplay}</span></div></div>`;
                    }).join('');
                return `<div class="card"><div class="header"><div class="info"><div class="name">RIPSITE</div><div class="status">Выбор: ${TYPE_LABELS[type] || ''}</div></div></div><div class="body"><div class="text">Точного совпадения для <strong>«${escapeHtml(title)}»</strong> нет. Выберите из списка или найдите через поиск.</div><div class="search"><svg class="search-icon" viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg><input type="text" class="search-input" placeholder="Поиск..."></div><div class="list">${itemsHtml}</div></div></div>`;
            }

            function createShadowHostUW(id, css, htmlContent) {
                const host = document.createElement('div');
                host.id = id;
                host.style.cssText = 'all:initial!important;display:block!important;width:100%!important;position:static!important;margin:16px 0!important';
                const shadow = host.attachShadow({ mode: 'open' });
                const style = document.createElement('style');
                style.textContent = css;
                shadow.appendChild(style);
                const wrap = document.createElement('div');
                wrap.innerHTML = htmlContent;
                while (wrap.firstChild) shadow.appendChild(wrap.firstChild);
                return { host, shadow };
            }

            function removeWidgetHosts() {
                Object.values(UW_HOST_IDS).forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.remove();
                });
            }

            function doInsertHost(host, cfg) {
                if (!cfg.insertSelector) return false;
                let target = null;
                try { target = document.querySelector(cfg.insertSelector); } catch (e) { return false; }
                if (!target) return false;
                const mode = cfg.insertMode || 'after';
                try {
                    if (mode === 'after') {
                        if (target.parentNode) target.parentNode.insertBefore(host, target.nextSibling);
                        else target.appendChild(host);
                    } else if (mode === 'before') {
                        if (target.parentNode) target.parentNode.insertBefore(host, target);
                        else target.appendChild(host);
                    } else if (mode === 'append') {
                        target.appendChild(host);
                    } else if (mode === 'prepend') {
                        target.insertBefore(host, target.firstChild);
                    } else {
                        if (target.parentNode) target.parentNode.insertBefore(host, target.nextSibling);
                        else target.appendChild(host);
                    }
                    return true;
                } catch (e) { return false; }
            }

            function renderWidget(cfg, container) {
                return new Promise((resolve) => {
                    if (!cfg || !cfg.insertSelector) { resolve(false); return; }
                    const types = Array.isArray(cfg.types) && cfg.types.length ? cfg.types : [cfg.type || 'anime'];
                    const type = cfg.type || types[0] || 'anime';
                    const title = getTitleFromConfig(cfg);
                    if (!title) { resolve(false); return; }

                    const parentForHost = container || null;
                    function placeHost(host) {
                        if (parentForHost) {
                            if (parentForHost.firstChild) parentForHost.removeChild(parentForHost.firstChild);
                            parentForHost.appendChild(host);
                            return true;
                        }
                        return doInsertHost(host, cfg);
                    }

                    removeWidgetHosts();
                    const sk = createShadowHostUW(UW_HOST_IDS.skeleton, UW_SKELETON_CSS, skeletonHtmlUW());
                    if (!placeHost(sk.host)) { resolve(false); return; }

                    Promise.all(types.map(t => fetchDbForType(t).then(db => getAllItemsByType(db, t).map(it => ({ ...it, _type: t }))).catch(() => []))).then(groups => {
                        if (!document.getElementById(UW_HOST_IDS.skeleton) && !parentForHost) { resolve(false); return; }
                        const items = groups.flat();
                        const norm = normalizeTitle(title);
                        const titleNorm = value => normalizeTitle(String(value || '').replace(/\s*[([]\s*(?:19|20)\d{2}\s*[)\]]/g, ''));
                        let exact = items.find(it => titleNorm(it.title) === titleNorm(title)) || null;
                        function showBlock(item, onBack) {
                            const itemType = item._type || type;
                            item = { ...item, rating: cfg.customRating !== undefined && String(cfg.customRating).trim() !== '' ? String(cfg.customRating).trim() : item.rating, review: cfg.customReview !== undefined && String(cfg.customReview).trim() !== '' ? String(cfg.customReview) : item.review };
                            removeWidgetHosts();
                            const b = createShadowHostUW(UW_HOST_IDS.block, UW_CARD_CSS, blockHtmlUW(item, itemType, !!onBack));
                            if (!placeHost(b.host)) { resolve(false); return; }
                            if (onBack) {
                                const backBtn = b.shadow.querySelector('.back');
                                if (backBtn) backBtn.addEventListener('click', onBack);
                            }
                            resolve(true);
                        }
                        function showSuggest() {
                            const suggestions = findSuggestions(title, items);
                            removeWidgetHosts();
                            const s = createShadowHostUW(UW_HOST_IDS.suggest, UW_SUGGEST_CSS, suggestHtmlUW(title, suggestions, type));
                            if (!placeHost(s.host)) { resolve(false); return; }
                            const listEl = s.shadow.querySelector('.list');
                            const searchInput = s.shadow.querySelector('.search-input');
                            function bind(items2) {
                                listEl.querySelectorAll('.item').forEach(el => {
                                    el.addEventListener('click', () => {
                                        const idx = parseInt(el.getAttribute('data-index'), 10);
                                        const picked = items2[idx];
                                        if (picked) showBlock(picked, showSuggest);
                                    });
                                });
                            }
                            function renderList(items2) {
                                if (!items2.length) { listEl.innerHTML = '<div class="empty">Ничего не найдено. Попробуйте другой запрос.</div>'; return; }
                                listEl.innerHTML = items2.map((it, i) => {
                                    let rankClass = 'rank-_';
                                    let rankDisplay = '?';
                                    if (type === 'game') {
                                        if (it.rating && it.rating !== '_') { rankClass = 'rank-' + it.rating; rankDisplay = it.rating; }
                                    } else {
                                        const n = parseRatingNum(it.rating);
                                        if (n !== null) { rankClass = 'rank-' + n; rankDisplay = String(n); }
                                    }
                                    return `<div class="item" data-index="${i}"><div class="item-title">${escapeHtml(it.title)}</div><div class="item-rank ${rankClass}"><span>${rankDisplay}</span></div></div>`;
                                }).join('');
                                bind(items2);
                            }
                            bind(suggestions);
                            searchInput.addEventListener('input', () => {
                                const q = searchInput.value.trim();
                                if (!q) { renderList(suggestions); return; }
                                renderList(filterByQuery(q, items));
                            });
                            resolve(true);
                        }
                        if (exact) showBlock(exact, null);
                        else showSuggest();
                    }).catch(() => {
                        removeWidgetHosts();
                        resolve(false);
                    });
                });
            }

            function makeDefaultConfig() {
                return {
                    hostname: getHostname(), enabled: false,
                    type: 'anime', types: ['anime'],
                    titleSource: 'tab', titleSelector: '',
                    titleTrimLeft: 0, titleTrimRight: 0,
                    customRating: '', customReview: '',
                    insertSelector: '', insertMode: 'after'
                };
            }
            let uiState = { open: false, cfg: getCurrentSiteConfig() || makeDefaultConfig(), previewShown: false };

            function ensureCfgForCurrentSite() {
                if (!uiState.cfg || uiState.cfg.hostname !== getHostname()) uiState.cfg = getCurrentSiteConfig() || makeDefaultConfig();
            }

            function saveCfgAndApply() {
                if (!uiState.cfg) return;
                uiState.cfg.hostname = getHostname();
                uiState.cfg.enabled = true;
                saveConfig(uiState.cfg);
                if (uiState.cfg.enabled) {
                    renderWidget(uiState.cfg).then(() => { });
                } else {
                    removeWidgetHosts();
                }
            }

            function buildUI() {
                injectUiStyles();
                let root = document.getElementById(UW_UI_ID);
                if (root) return root;
                root = document.createElement('div');
                root.id = UW_UI_ID;
                root.innerHTML = `
                    <button type="button" class="uw-fab" title="RIPINFO Виджет" aria-label="Открыть конструктор виджета">
                        <img src="${getRipmoreIconUrl()}" alt="RIPMORE">
                    </button>
                    <div class="uw-panel" role="dialog" aria-label="Настройки RIPINFO Виджета">
                        <div class="uw-panel-header">
                            <img src="${getRipmoreIconUrl()}" alt="">
                            <div class="uw-panel-title">RIPINFO Виджет</div>
                            <button type="button" class="uw-panel-close" aria-label="Закрыть">
                                <svg viewBox="0 0 24 24"><path d="M6.414 5 5 6.414l5.588 5.588L5 17.59l1.414 1.414 5.588-5.588 5.588 5.588 1.414-1.414-5.588-5.588 5.588-5.588L17.59 5l-5.588 5.588L6.414 5Z"/></svg>
                            </button>
                        </div>
                        <div class="uw-panel-body"></div>
                    </div>
                    <div class="uw-toast"></div>
                `;
                document.body.appendChild(root);

                const fab = root.querySelector('.uw-fab');
                const panel = root.querySelector('.uw-panel');
                const closeBtn = root.querySelector('.uw-panel-close');
                fab.addEventListener('click', (e) => { e.stopPropagation(); togglePanel(); });
                closeBtn.addEventListener('click', (e) => { e.stopPropagation(); togglePanel(false); });
                document.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape' && uiState.open) togglePanel(false);
                }, true);
                return root;
            }

            function showToast(msg) {
                const root = document.getElementById(UW_UI_ID);
                if (!root) return;
                const t = root.querySelector('.uw-toast');
                if (!t) return;
                t.textContent = msg;
                t.classList.add('show');
                clearTimeout(showToast._t);
                showToast._t = setTimeout(() => t.classList.remove('show'), 2400);
            }

            function togglePanel(force) {
                const root = buildUI();
                const panel = root.querySelector('.uw-panel');
                const open = typeof force === 'boolean' ? force : !uiState.open;
                uiState.open = open;
                panel.classList.toggle('open', open);
                if (open) renderPanel();
            }

            function renderPanel() {
                const root = document.getElementById(UW_UI_ID);
                if (!root) return;
                ensureCfgForCurrentSite();
                const body = root.querySelector('.uw-panel-body');
                if (!body) return;
                const cfg = uiState.cfg;
                const currentTitle = getTitleFromConfig(cfg) || '(пусто)';

                if (!Array.isArray(cfg.types) || !cfg.types.length) cfg.types = [cfg.type || 'anime'];
                let typeHtml = '';
                ['anime', 'movie', 'game'].forEach(t => {
                    typeHtml += `<button type="button" class="uw-choice ${cfg.types.includes(t) ? 'active' : ''}" data-uw-type="${t}" aria-pressed="${cfg.types.includes(t)}">${TYPE_LABELS[t]}</button>`;
                });

                let titleSourceHtml = `
                    <button type="button" class="uw-choice ${cfg.titleSource === 'tab' ? 'active' : ''}" data-uw-tsource="tab">Название вкладки</button>
                    <button type="button" class="uw-choice ${cfg.titleSource === 'element' ? 'active' : ''}" data-uw-tsource="element">Выбрать элемент</button>
                `;
                let titleSelectorHtml = '';
                if (cfg.titleSource === 'element') {
                    if (cfg.titleSelector) {
                        const preview = getSelectorPreview(cfg.titleSelector);
                        titleSelectorHtml = `<div class="uw-tag"><b>${escapeHtml(cfg.titleSelector)}</b>${preview ? ' — ' + escapeHtml(preview.slice(0, 40)) : ''}<button type="button" class="uw-tag-clear" data-uw-tclear="title">×</button></div>`;
                    } else {
                        titleSelectorHtml = `<div class="uw-hint">Элемент не выбран. Нажмите «Выбрать элемент» ниже.</div>`;
                    }
                    titleSelectorHtml += `<div class="uw-row"><button type="button" class="uw-btn" data-uw-pick="title">${cfg.titleSelector ? 'Перевыбрать' : 'Выбрать элемент'}</button></div>`;
                }

                let insertHtml = '';
                if (cfg.insertSelector) {
                    const modeLabels = { after: 'после', before: 'перед', append: 'внутрь (в конец)', prepend: 'внутрь (в начало)' };
                    insertHtml = `<div class="uw-tag"><b>${escapeHtml(cfg.insertSelector)}</b><button type="button" class="uw-tag-clear" data-uw-tclear="insert">×</button></div>
                    <div class="uw-row">
                        <select class="uw-input" data-uw-mode style="padding:8px 10px;">
                            <option value="after" ${cfg.insertMode === 'after' ? 'selected' : ''}>Вставить после</option>
                            <option value="before" ${cfg.insertMode === 'before' ? 'selected' : ''}>Вставить перед</option>
                            <option value="append" ${cfg.insertMode === 'append' ? 'selected' : ''}>Внутрь, в конец</option>
                            <option value="prepend" ${cfg.insertMode === 'prepend' ? 'selected' : ''}>Внутрь, в начало</option>
                        </select>
                    </div>`;
                } else {
                    insertHtml = `<div class="uw-hint">Позиция не выбрана. Нажмите «Выбрать позицию».</div>`;
                }
                insertHtml += `<div class="uw-row"><button type="button" class="uw-btn" data-uw-pick="insert">${cfg.insertSelector ? 'Перевыбрать позицию' : 'Выбрать позицию'}</button></div>`;


                const enabledBadge = cfg.enabled
                    ? `<span class="uw-status-badge on"><span class="uw-status-dot"></span>Включён</span>`
                    : `<span class="uw-status-badge off"><span class="uw-status-dot"></span>Отключён</span>`;

                body.innerHTML = `
                    <div class="uw-row" style="justify-content:space-between;align-items:center;">
                        <div class="uw-label">Статус</div>${enabledBadge}
                    </div>
                    <div class="uw-section">
                        <div class="uw-label">Тип контента (можно несколько)</div>
                        <div class="uw-row">${typeHtml}</div>
                        <div class="uw-hint">От этого зависит, из какой базы брать данные: ${TYPE_LABELS.anime}, ${TYPE_LABELS.movie} или ${TYPE_LABELS.game}.</div>
                    </div>
                    <div class="uw-divider"></div>
                    <div class="uw-section">
                        <div class="uw-label">Откуда брать название</div>
                        <div class="uw-row">${titleSourceHtml}</div>
                        ${titleSelectorHtml}
                        <div class="uw-label">Дополнительное правило</div>
                        <div class="uw-hint">Если в элементе или названии вкладки есть лишние символы (год, «фильм», «смотреть онлайн» и т.п.), укажите, сколько символов срезать слева и справа. Например, из «Доктор Стрэндж фильм (2016)» при обрезке справа на 13 символов получится «Доктор Стрэндж».</div>
                        <div class="uw-row">
                            <input class="uw-input" style="width:90px;flex:0 0 auto;" type="number" min="0" data-uw-trim-left  value="${parseInt(cfg.titleTrimLeft, 10) || 0}"  placeholder="слева">
                            <input class="uw-input" style="width:90px;flex:0 0 auto;" type="number" min="0" data-uw-trim-right value="${parseInt(cfg.titleTrimRight, 10) || 0}" placeholder="справа">
                            <button type="button" class="uw-btn" data-uw-trim-auto>Автоопределить</button>
                        </div>
                        <div class="uw-hint">Результат для поиска: <b style="color:${THEME.text}">${escapeHtml(String(currentTitle).slice(0, 120))}</b></div>
                    </div>
                    <div class="uw-divider"></div>
                    <div class="uw-section">
                        <div class="uw-label">Куда вставить виджет</div>
                        ${insertHtml}
                    </div>
                    <div class="uw-divider"></div>
                    <div class="uw-section">
                        <div class="uw-label">Оценка и текст карточки</div>
                        <input class="uw-input" data-uw-rating placeholder="Оценка (пусто — брать из базы)" value="${escapeHtml(cfg.customRating || '')}">
                        <textarea class="uw-input" data-uw-review rows="4" placeholder="Текст отзыва (пусто — брать из базы)" style="resize:vertical;">${escapeHtml(cfg.customReview || '')}</textarea>
                        <div class="uw-hint">Для игр укажите ранг S–F; для фильма или аниме — число от 1 до 10. Оставьте поле пустым, чтобы использовать JSON.</div>
                    </div>
                    <div class="uw-divider"></div>
                    <div class="uw-section">
                        <div class="uw-label">Превью на странице</div>
                        <div class="uw-row">
                            <button type="button" class="uw-btn" data-uw-preview>Показать превью</button>
                            <button type="button" class="uw-btn" data-uw-preview-clear>Убрать</button>
                        </div>
                    </div>
                    <div class="uw-actions-row">
                        <button type="button" class="uw-btn uw-btn-success" data-uw-enable>Включить</button>
                        <button type="button" class="uw-btn uw-btn-danger" data-uw-disable>Выключить</button>
                        <button type="button" class="uw-btn" data-uw-save>Сохранить</button>
                    </div>
                `;

                body.querySelectorAll('[data-uw-type]').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const t = btn.getAttribute('data-uw-type');
                        const list = Array.isArray(uiState.cfg.types) ? uiState.cfg.types : [uiState.cfg.type || 'anime'];
                        uiState.cfg.types = list.includes(t) ? list.filter(x => x !== t) : [...list, t];
                        if (!uiState.cfg.types.length) uiState.cfg.types = [t];
                        uiState.cfg.type = uiState.cfg.types[0];
                        renderPanel();
                    });
                });
                body.querySelectorAll('[data-uw-tsource]').forEach(btn => {
                    btn.addEventListener('click', () => {
                        uiState.cfg.titleSource = btn.getAttribute('data-uw-tsource');
                        renderPanel();
                    });
                });
                const pickTitleBtn = body.querySelector('[data-uw-pick="title"]');
                if (pickTitleBtn) pickTitleBtn.addEventListener('click', () => {
                    togglePanel(false);
                    setTimeout(() => {
                        startPicker({ banner: 'Выберите элемент, из которого брать название. <b>Esc</b> — отмена' }, (sel, el) => {
                            uiState.cfg.titleSource = 'element';
                            uiState.cfg.titleSelector = sel;
                            togglePanel(true);
                        }, () => { togglePanel(true); });
                    }, 120);
                });
                const pickInsertBtn = body.querySelector('[data-uw-pick="insert"]');
                if (pickInsertBtn) pickInsertBtn.addEventListener('click', () => {
                    togglePanel(false);
                    setTimeout(() => {
                        startPicker({ banner: 'Выберите элемент для вставки виджета. <b>Esc</b> — отмена' }, (sel) => {
                            uiState.cfg.insertSelector = sel;
                            togglePanel(true);
                        }, () => { togglePanel(true); });
                    }, 120);
                });
                body.querySelectorAll('[data-uw-tclear]').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const which = btn.getAttribute('data-uw-tclear');
                        if (which === 'title') { uiState.cfg.titleSelector = ''; }
                        else if (which === 'insert') { uiState.cfg.insertSelector = ''; }
                        renderPanel();
                    });
                });
                const trimLeftInput = body.querySelector('[data-uw-trim-left]');
                const trimRightInput = body.querySelector('[data-uw-trim-right]');
                if (trimLeftInput) trimLeftInput.addEventListener('input', () => { uiState.cfg.titleTrimLeft = Math.max(0, parseInt(trimLeftInput.value, 10) || 0); });
                if (trimRightInput) trimRightInput.addEventListener('input', () => { uiState.cfg.titleTrimRight = Math.max(0, parseInt(trimRightInput.value, 10) || 0); });

                const trimAutoBtn = body.querySelector('[data-uw-trim-auto]');
                if (trimAutoBtn) trimAutoBtn.addEventListener('click', async () => {
                    trimAutoBtn.disabled = true;
                    trimAutoBtn.textContent = 'Ищу…';
                    try {
                        const rawCandidates = [];
                        rawCandidates.push(document.title || '');
                        rawCandidates.push(cleanTitle(document.title || '', uiState.cfg));
                        document.querySelectorAll('h1,h2,[itemprop="name"],.title,.movie-title,.film-title').forEach(el => {
                            if (el.closest('#' + UW_UI_ID) || !el.textContent.trim()) return;
                            rawCandidates.push(el.textContent.trim());
                            rawCandidates.push(cleanTitle(el.textContent.trim(), uiState.cfg));
                        });
                        const types = ['anime', 'movie', 'game'];
                        const dbs = await Promise.all(types.map(t => fetchDbForType(t).then(db => ({ t, items: getAllItemsByType(db, t) }))));

                        const baseRaw = uiState.cfg.titleSource === 'element' && uiState.cfg.titleSelector
                            ? (() => { try { const el = document.querySelector(uiState.cfg.titleSelector); return el ? (el.textContent || '').trim() : ''; } catch (e) { return ''; } })()
                            : (document.title || '');
                        const baseClean = cleanTitle(baseRaw, uiState.cfg);

                        let best = null;
                        for (const group of dbs) {
                            for (const it of group.items) {
                                const trim = computeTrim(baseClean, it.title);
                                if (!trim) continue;
                                const total = trim.left + trim.right;
                                const score = 1000 - total + it.title.length;
                                if (!best || score > best.score) best = { trim, item: it, type: group.t, score };
                            }
                        }
                        if (!best) { showToast('Совпадений не найдено — задайте обрезку вручную'); }
                        else {
                            uiState.cfg.titleTrimLeft = best.trim.left;
                            uiState.cfg.titleTrimRight = best.trim.right;
                            uiState.cfg.type = best.type;
                            uiState.cfg.types = [best.type];
                            renderPanel();
                            showToast(`Обрезка: слева ${best.trim.left}, справа ${best.trim.right} → «${best.item.title}»`);
                        }
                    } catch (e) {
                        showToast('Не удалось проверить базы');
                    } finally {
                        trimAutoBtn.disabled = false;
                        trimAutoBtn.textContent = 'Автоопределить';
                    }
                });
                const ratingInput = body.querySelector('[data-uw-rating]');
                const reviewInput = body.querySelector('[data-uw-review]');
                if (ratingInput) ratingInput.addEventListener('input', () => { uiState.cfg.customRating = ratingInput.value; });
                if (reviewInput) reviewInput.addEventListener('input', () => { uiState.cfg.customReview = reviewInput.value; });

                const modeSel = body.querySelector('[data-uw-mode]');
                if (modeSel) modeSel.addEventListener('change', () => {
                    uiState.cfg.insertMode = modeSel.value || 'after';
                });
                function renderPreviewOnPage() {
                    const old = document.getElementById(UW_PREVIEW_ID);
                    if (old) old.remove();
                    const type = (uiState.cfg.types && uiState.cfg.types[0]) || uiState.cfg.type || 'anime';
                    const demo = { title: getTitleFromConfig(uiState.cfg) || 'Доктор Стрэндж', rating: uiState.cfg.customRating || (type === 'game' ? 'S' : '8'), review: uiState.cfg.customReview || 'Пример текста карточки RIPINFO. Здесь отображается оценка и текст, которые вы настроили.', date: 'Превью', slug: 'doctor-strange' };
                    const previewHost = createShadowHostUW(UW_PREVIEW_ID, UW_CARD_CSS, blockHtmlUW(demo, type, false));
                    previewHost.host.setAttribute('data-ripinfo-preview', 'true');
                    const target = insertWidgetAt(uiState.cfg);
                    if (target && target.parentNode) {
                        const mode = uiState.cfg.insertMode || 'after';
                        if (mode === 'before') target.parentNode.insertBefore(previewHost.host, target);
                        else if (mode === 'append') target.appendChild(previewHost.host);
                        else if (mode === 'prepend') target.insertBefore(previewHost.host, target.firstChild);
                        else target.parentNode.insertBefore(previewHost.host, target.nextSibling);
                    } else (document.body || document.documentElement).appendChild(previewHost.host);
                    showToast('Превью показано на странице');
                }
                const previewBtn = body.querySelector('[data-uw-preview]');
                if (previewBtn) previewBtn.addEventListener('click', renderPreviewOnPage);
                const previewClearBtn = body.querySelector('[data-uw-preview-clear]');
                if (previewClearBtn) previewClearBtn.addEventListener('click', () => { const el = document.getElementById(UW_PREVIEW_ID); if (el) el.remove(); showToast('Превью убрано'); });
                const enableBtn = body.querySelector('[data-uw-enable]');
                if (enableBtn) enableBtn.addEventListener('click', () => { uiState.cfg.enabled = true; uiState.cfg.hostname = getHostname(); saveConfig(uiState.cfg); renderWidget(uiState.cfg); showToast('Виджет включён на этом сайте'); renderPanel(); });
                const disableBtn = body.querySelector('[data-uw-disable]');
                if (disableBtn) disableBtn.addEventListener('click', () => { uiState.cfg.enabled = false; uiState.cfg.hostname = getHostname(); saveConfig(uiState.cfg); removeWidgetHosts(); showToast('Виджет выключен на этом сайте'); renderPanel(); });
                const saveBtn = body.querySelector('[data-uw-save]');
                if (saveBtn) saveBtn.addEventListener('click', () => {
                    uiState.cfg.hostname = getHostname();
                    saveConfig(uiState.cfg);
                    if (uiState.cfg.enabled) renderWidget(uiState.cfg);
                    showToast('Настройки сохранены');
                });
            }

            function bootWidget() {
                const cfg = getCurrentSiteConfig();
                const widgetUiEnabled = isEnabled('universal_widget');

                if (widgetUiEnabled) {
                    buildUI();
                }

                if (!cfg || cfg.enabled === false || !configMatchesSite(cfg)) return;

                uiState.cfg = cfg;

                if (widgetUiEnabled) {
                    buildUI();
                    const fab = document.querySelector('#' + UW_UI_ID + ' .uw-fab');
                    if (fab) fab.classList.add('active');
                }

                let attempts = 0;
                const maxAttempts = 40;
                function tryRender() {
                    attempts++;
                    renderWidget(cfg).then(ok => {
                        if (!ok && attempts < maxAttempts) setTimeout(tryRender, 500);
                    });
                }
                tryRender();

                let lastUrl = location.href;
                setInterval(() => {
                    if (location.href !== lastUrl) {
                        lastUrl = location.href;
                        if (uiState.cfg && uiState.cfg.enabled) {
                            removeWidgetHosts();
                            setTimeout(() => renderWidget(uiState.cfg), 400);
                        }
                    }
                }, 800);

                if (cfg.titleSource === 'element' && cfg.titleSelector) {
                    let lastTitle = getTitleFromConfig(cfg);
                    setInterval(() => {
                        if (!uiState.cfg || !uiState.cfg.enabled) return;
                        const cur = getTitleFromConfig(uiState.cfg);
                        if (cur && cur !== lastTitle) {
                            lastTitle = cur;
                            removeWidgetHosts();
                            renderWidget(uiState.cfg);
                        }
                    }, 1500);
                }
            }

            if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootWidget);
            else bootWidget();
        })();
    }
    (function initVoiceCore() {
        'use strict';

        const __RV_API_URL = 'https://dbimg.app/api/upload';
        const __RV_BTN_ID = 'ripper-voice-btn';
        const __RV_MENU_ID = 'ripper-voice-menu';
        const __RV_SETTINGS_KEY = 'dbimg_api_key';
        const __RV_MAX_RECORD_MS = 5 * 60 * 1000;

        let __RV_mediaRecorder = null;
        let __RV_audioChunks = [];
        let __RV_isRecording = false;
        let __RV_recordTimeout = null;

        function __RV_getApiKey() { return (GM_getValue(__RV_SETTINGS_KEY, '') || '').trim(); }
        function __RV_setApiKey(key) { GM_setValue(__RV_SETTINGS_KEY, String(key || '').trim()); }

        function __RV_sanitizeUrl(url) {
            if (!url) return '';
            return String(url).replace(/[\uFEFF\u200B\u200C\u200D\u2060]/g, '').trim();
        }

        function __RV_injectPlayerStyles() {
            if (document.getElementById('ripper-voice-player-styles')) return;
            const style = document.createElement('style');
            style.id = 'ripper-voice-player-styles';
            style.textContent = '\
            .ripper-voice-player{display:inline-flex;align-items:center;gap:10px;background:#101015;border:1px solid #1e1e28;border-radius:10px;padding:8px 12px;margin:6px 0;min-width:280px;max-width:100%;font-family:"Inter",system-ui,sans-serif;color:#e0e0ff;box-shadow:0 4px 14px rgba(0,0,0,.5);position:relative;box-sizing:border-box}\
            .ripper-voice-main{display:flex;align-items:center;gap:10px;flex:1;min-width:0}\
            .ripper-voice-play{width:36px;height:36px;border-radius:50%;background:#c11f2b;border:none;color:#fff;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;font-size:16px;transition:background .15s;padding:0}\
            .ripper-voice-play:hover{background:#d4232f}\
            .ripper-voice-play svg{width:16px;height:16px;fill:currentColor;display:block}\
            .ripper-voice-body{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}\
            .ripper-voice-bar{height:6px;background:#1e1e28;border-radius:3px;overflow:hidden;cursor:pointer}\
            .ripper-voice-fill{height:100%;width:0%;background:#c11f2b;border-radius:3px;transition:width .1s linear}\
            .ripper-voice-time{display:flex;justify-content:space-between;font-size:10px;color:#a0a0cc;font-variant-numeric:tabular-nums}\
            .ripper-voice-volume-wrap{position:relative;display:inline-flex;align-items:center;flex-shrink:0}\
            .ripper-voice-vol-btn{width:28px;height:28px;border-radius:6px;background:transparent;border:none;color:#a0a0cc;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;padding:0;transition:background .15s,color .15s}\
            .ripper-voice-vol-btn:hover{background:rgba(255,255,255,.08);color:#e0e0ff}\
            .ripper-voice-vol-btn svg{width:18px;height:18px;fill:currentColor;display:block}\
            .ripper-voice-vol-popup{position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%);background:#101015;border:1px solid #1e1e28;border-radius:8px;padding:10px 6px;display:none;z-index:100;box-shadow:0 6px 20px rgba(0,0,0,.7);flex-direction:column;align-items:center}\
            .ripper-voice-vol-popup.open{display:flex}\
            .ripper-voice-vol-popup input[type="range"]{-webkit-appearance:none;appearance:none;width:6px;height:100px;background:#1e1e28;border-radius:3px;outline:none;cursor:pointer;writing-mode:vertical-lr;direction:rtl}\
            .ripper-voice-vol-popup input[type="range"]::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:16px;height:16px;border-radius:50%;background:#c11f2b;cursor:pointer;box-shadow:0 0 0 2px #101015}\
            .ripper-voice-vol-popup input[type="range"]::-moz-range-thumb{width:16px;height:16px;border-radius:50%;background:#c11f2b;cursor:pointer;border:none;box-shadow:0 0 0 2px #101015}\
            .ripper-voice-player audio{display:none}\
        ';
            (document.head || document.documentElement).appendChild(style);
        }

        function __RV_buildPlayer(src) {
            const wrap = document.createElement('span');
            wrap.className = 'ripper-voice-player';
            const audio = document.createElement('audio');
            audio.preload = 'auto';
            const main = document.createElement('div');
            main.className = 'ripper-voice-main';
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'ripper-voice-play';
            btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
            const body = document.createElement('div');
            body.className = 'ripper-voice-body';
            const bar = document.createElement('div');
            bar.className = 'ripper-voice-bar';
            const fill = document.createElement('div');
            fill.className = 'ripper-voice-fill';
            bar.appendChild(fill);
            const time = document.createElement('div');
            time.className = 'ripper-voice-time';
            const cur = document.createElement('span'); cur.textContent = '0:00';
            const dur = document.createElement('span'); dur.textContent = '0:00';
            time.appendChild(cur); time.appendChild(dur);
            body.appendChild(bar); body.appendChild(time);
            main.appendChild(btn); main.appendChild(body);
            const volWrap = document.createElement('div');
            volWrap.className = 'ripper-voice-volume-wrap';
            const volBtn = document.createElement('button');
            volBtn.type = 'button';
            volBtn.className = 'ripper-voice-vol-btn';
            volBtn.title = 'Громкость';
            volBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>';
            const volPopup = document.createElement('div');
            volPopup.className = 'ripper-voice-vol-popup';
            const volSlider = document.createElement('input');
            volSlider.type = 'range'; volSlider.min = '0'; volSlider.max = '2'; volSlider.step = '0.01'; volSlider.value = '1';
            volPopup.appendChild(volSlider);
            volWrap.appendChild(volBtn); volWrap.appendChild(volPopup);
            wrap.appendChild(audio); wrap.appendChild(main); wrap.appendChild(volWrap);

            function fmt(t) {
                if (!isFinite(t) || t < 0) return '0:00';
                const m = Math.floor(t / 60);
                const s = Math.floor(t % 60);
                return m + ':' + (s < 10 ? '0' : '') + s;
            }
            function updateDuration() {
                if (isFinite(audio.duration) && audio.duration > 0) dur.textContent = fmt(audio.duration);
            }
            let audioCtx = null, gainNode = null, sourceNode = null;
            function setupGain() {
                if (audioCtx || !window.AudioContext) return;
                try {
                    audioCtx = new AudioContext();
                    sourceNode = audioCtx.createMediaElementSource(audio);
                    gainNode = audioCtx.createGain();
                    gainNode.gain.value = 1;
                    sourceNode.connect(gainNode);
                    gainNode.connect(audioCtx.destination);
                } catch (e) { console.warn('Web Audio API not available:', e); }
            }
            volBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                volPopup.classList.toggle('open');
            });
            document.addEventListener('mousedown', (e) => {
                if (!volWrap.contains(e.target)) volPopup.classList.remove('open');
            });
            volSlider.addEventListener('input', () => {
                const v = parseFloat(volSlider.value);
                setupGain();
                if (gainNode) { gainNode.gain.value = v; audio.volume = 1; }
                else audio.volume = Math.min(1, v);
            });
            let loaded = false, loading = false, blobUrl = null;
            function loadAudioBlob() {
                if (loaded || loading) return;
                loading = true;
                btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z" opacity="0.4"/></svg>';
                GM_xmlhttpRequest({
                    method: 'GET', url: src, responseType: 'blob', timeout: 30000,
                    onload: (resp) => {
                        loading = false;
                        if (resp.status < 200 || resp.status >= 300) { btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>'; return; }
                        const blob = resp.response;
                        if (!blob) { btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>'; return; }
                        loaded = true;
                        blobUrl = URL.createObjectURL(blob);
                        audio.src = blobUrl;
                        audio.load();
                        if (wrap.dataset.wantPlay === '1') { audio.play().catch(() => { }); wrap.dataset.wantPlay = '0'; }
                    },
                    onerror: () => { loading = false; btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>'; },
                    ontimeout: () => { loading = false; btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>'; }
                });
            }
            btn.onclick = () => {
                setupGain();
                if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
                if (!loaded) { wrap.dataset.wantPlay = '1'; loadAudioBlob(); return; }
                if (audio.paused) audio.play().catch(() => { }); else audio.pause();
            };
            audio.addEventListener('play', () => { btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>'; });
            audio.addEventListener('pause', () => { btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>'; });
            audio.addEventListener('ended', () => { btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>'; fill.style.width = '0%'; cur.textContent = '0:00'; });
            audio.addEventListener('loadedmetadata', updateDuration);
            audio.addEventListener('durationchange', updateDuration);
            audio.addEventListener('canplaythrough', updateDuration);
            audio.addEventListener('timeupdate', () => {
                if (audio.duration > 0) fill.style.width = ((audio.currentTime / audio.duration) * 100) + '%';
                cur.textContent = fmt(audio.currentTime);
            });
            bar.onclick = (e) => {
                if (!loaded) return;
                const rect = bar.getBoundingClientRect();
                const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
                if (audio.duration > 0) audio.currentTime = ratio * audio.duration;
            };
            return wrap;
        }

        function __RV_getVoiceTextNodes(root) {
            const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
                acceptNode(node) {
                    if (node.parentElement && node.parentElement.closest('.ripper-voice-player')) return NodeFilter.FILTER_REJECT;
                    if (node.parentElement && node.parentElement.closest('.ripper-img-processed')) return NodeFilter.FILTER_REJECT;
                    return NodeFilter.FILTER_ACCEPT;
                }
            });
            const out = [];
            let n;
            while (n = walker.nextNode()) out.push(n);
            return out;
        }

        function __RV_removeVoiceRange(root, start, end, playerShortExt) {
            const nodes = __RV_getVoiceTextNodes(root);
            if (!nodes.length) return;

            let pos = 0;
            const affected = [];
            for (const node of nodes) {
                const len = (node.nodeValue || '').length;
                const nStart = pos;
                const nEnd = pos + len;
                pos = nEnd;
                if (nEnd <= start) continue;
                if (nStart >= end) break;
                affected.push({ node, nStart, len });
            }
            if (!affected.length) return;

            if (playerShortExt) {
                const first = affected[0];
                const localStart = Math.max(0, start - first.nStart);
                const localEnd = Math.min(first.len, end - first.nStart);
                const before = (first.node.nodeValue || '').slice(0, localStart);
                const after = (first.node.nodeValue || '').slice(localEnd);
                const parent = first.node.parentNode;
                if (!parent) return;

                const frag = document.createDocumentFragment();
                if (before) frag.appendChild(document.createTextNode(before));
                const player = __RV_buildPlayer('https://cdn.dbimg.app/' + playerShortExt);
                player.dataset.voiceShortExt = playerShortExt;
                frag.appendChild(player);
                if (after) frag.appendChild(document.createTextNode(after));
                parent.replaceChild(frag, first.node);

                for (let k = 1; k < affected.length; k++) {
                    const a = affected[k];
                    const lStart = Math.max(0, start - a.nStart);
                    const lEnd = Math.min(a.len, end - a.nStart);
                    a.node.nodeValue = (a.node.nodeValue || '').slice(0, lStart)
                        + (a.node.nodeValue || '').slice(lEnd);
                }
            } else {
                for (const a of affected) {
                    const lStart = Math.max(0, start - a.nStart);
                    const lEnd = Math.min(a.len, end - a.nStart);
                    a.node.nodeValue = (a.node.nodeValue || '').slice(0, lStart)
                        + (a.node.nodeValue || '').slice(lEnd);
                }
            }
        }

        function __RV_processVoiceMessageReal(messageElement) {
            if (!messageElement) return;
            if (!isEnabled('twitch_audio_codes')) return;
            if (messageElement.closest('[data-a-target="chat-input"]')) return;
            if (messageElement.closest('.ripper-voice-player')) return;
            if (messageElement.dataset.ripperVoiceDone === '1') return;

            const textNodes = __RV_getVoiceTextNodes(messageElement);
            if (!textNodes.length) return;

            let fullText = '';
            for (const node of textNodes) fullText += node.nodeValue || '';

            const re = /(?:<|&lt;)voice_([a-zA-Z0-9]+\.[a-zA-Z0-9]+)(?:>|&gt;)/g;
            const matches = [];
            let m;
            while ((m = re.exec(fullText)) !== null) {
                matches.push({ shortExt: m[1], start: m.index, end: m.index + m[0].length });
            }
            if (!matches.length) return;

            messageElement.dataset.ripperVoiceDone = '1';
            for (let i = matches.length - 1; i >= 0; i--) {
                const match = matches[i];
                __RV_removeVoiceRange(messageElement, match.start, match.end,
                    i === 0 ? match.shortExt : null);
            }

            for (const node of __RV_getVoiceTextNodes(messageElement)) {
                const before = node.nodeValue || '';
                const after = before.replace(/(?:<|&lt;)\s*(?:>|&gt;)/g, '');
                if (after !== before) node.nodeValue = after;
            }
        }

        function __RV_observeChatForVoice() {
            const observer = new MutationObserver((mutations) => {
                if (!isEnabled('twitch_audio_codes')) return;
                for (const m of mutations) {
                    for (const added of m.addedNodes) {
                        if (added.nodeType !== 1) continue;
                        const candidates = [];
                        if (added.matches && added.matches('.chat-line__message')) candidates.push(added);
                        if (added.querySelectorAll) added.querySelectorAll('.chat-line__message').forEach(el => candidates.push(el));
                        for (const el of candidates) __RV_processVoiceMessageReal(el);
                    }
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
            document.querySelectorAll('.chat-line__message').forEach(__RV_processVoiceMessageReal);
        }

        function __RV_buildMenu() {
            let menu = document.getElementById(__RV_MENU_ID);
            if (menu) return menu;
            menu = document.createElement('div');
            menu.id = __RV_MENU_ID;
            menu.style.cssText = 'position:fixed;z-index:2147483647;background:#101015;border:1px solid #1e1e28;border-radius:10px;padding:6px;display:none;flex-direction:column;gap:4px;min-width:200px;box-shadow:0 8px 28px rgba(0,0,0,.7);font-family:"Inter",system-ui,sans-serif;color:#e0e0ff;';
            const recordBtn = document.createElement('button');
            recordBtn.type = 'button';
            recordBtn.textContent = '🎙 Записать голосовое';
            recordBtn.style.cssText = 'display:block;width:100%;padding:10px 14px;background:transparent;border:none;border-radius:6px;color:#e0e0ff;cursor:pointer;text-align:left;font-size:13px;font-weight:600;';
            recordBtn.onmouseover = () => recordBtn.style.background = 'rgba(193,31,43,.15)';
            recordBtn.onmouseout = () => recordBtn.style.background = 'transparent';
            recordBtn.onclick = () => {
                menu.style.display = 'none';
                const btn = document.getElementById(__RV_BTN_ID);
                if (btn) __RV_startRecording(btn);
            };
            const settingsBtn = document.createElement('button');
            settingsBtn.type = 'button';
            settingsBtn.textContent = '⚙ Настройки';
            settingsBtn.style.cssText = 'display:block;width:100%;padding:10px 14px;background:transparent;border:none;border-radius:6px;color:#e0e0ff;cursor:pointer;text-align:left;font-size:13px;font-weight:600;';
            settingsBtn.onmouseover = () => settingsBtn.style.background = 'rgba(193,31,43,.15)';
            settingsBtn.onmouseout = () => settingsBtn.style.background = 'transparent';
            settingsBtn.onclick = () => { menu.style.display = 'none'; __RV_openSettings(); };
            menu.appendChild(recordBtn);
            menu.appendChild(settingsBtn);
            document.body.appendChild(menu);
            return menu;
        }

        function __RV_toggleMenu(btn) {
            if (__RV_isRecording) return;
            const menu = __RV_buildMenu();
            if (menu.style.display === 'flex') { menu.style.display = 'none'; return; }
            const rect = btn.getBoundingClientRect();
            menu.style.display = 'flex';
            const menuRect = menu.getBoundingClientRect();
            let left = rect.left;
            let top = rect.bottom + 6;
            if (left + menuRect.width > window.innerWidth - 6) left = window.innerWidth - menuRect.width - 6;
            if (top + menuRect.height > window.innerHeight - 6) top = rect.top - menuRect.height - 6;
            menu.style.left = left + 'px';
            menu.style.top = top + 'px';
        }

        document.addEventListener('mousedown', (e) => {
            const menu = document.getElementById(__RV_MENU_ID);
            const btn = document.getElementById(__RV_BTN_ID);
            if (!menu || menu.style.display !== 'flex') return;
            if (menu.contains(e.target) || (btn && btn.contains(e.target))) return;
            menu.style.display = 'none';
        }, true);

        function __RV_openSettings() {
            const old = document.getElementById('ripper-voice-settings');
            if (old) old.remove();
            const overlay = document.createElement('div');
            overlay.id = 'ripper-voice-settings';
            overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;font-family:Inter,system-ui,sans-serif;';
            const box = document.createElement('div');
            box.style.cssText = 'background:#101015;border:1px solid #1e1e28;border-radius:12px;padding:20px;width:360px;max-width:90vw;color:#e0e0ff;box-shadow:0 16px 48px rgba(0,0,0,.85);';
            box.innerHTML = '<div style="font-weight:700;font-size:14px;margin-bottom:14px;">Настройки dbimg</div>' +
                '<div style="font-size:12px;color:#a0a0cc;margin-bottom:6px;">API-ключ</div>' +
                '<input id="ripper-voice-api-input" type="text" placeholder="dbimg_xxxxxxxx" style="width:100%;box-sizing:border-box;padding:10px 12px;background:#09090f;border:1px solid #1e1e28;border-radius:8px;color:#e0e0ff;font-size:13px;outline:none;" />' +
                '<div style="font-size:11px;color:#a0a0cc;margin-top:8px;line-height:1.4;">Ключ создаётся в личном кабинете dbimg.app (бесплатно).</div>' +
                '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px;">' +
                '<button id="ripper-voice-cancel" type="button" style="padding:8px 16px;background:transparent;border:1px solid #1e1e28;border-radius:8px;color:#a0a0cc;cursor:pointer;font-size:12px;font-weight:600;">Отмена</button>' +
                '<button id="ripper-voice-save" type="button" style="padding:8px 16px;background:#c11f2b;border:none;border-radius:8px;color:#fff;cursor:pointer;font-size:12px;font-weight:600;">Сохранить</button>' +
                '</div>';
            overlay.appendChild(box);
            document.body.appendChild(overlay);
            const input = box.querySelector('#ripper-voice-api-input');
            input.value = __RV_getApiKey();
            box.querySelector('#ripper-voice-cancel').onclick = () => overlay.remove();
            box.querySelector('#ripper-voice-save').onclick = () => {
                __RV_setApiKey(input.value);
                overlay.remove();
                alert('Ключ сохранён');
            };
            overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
            input.focus();
        }

        async function __RV_startRecording(btn) {
            if (!__RV_getApiKey()) {
                alert('Сначала укажите API-ключ dbimg: меню RIPSITE → ⚙ Настройки → «dbimg API-ключ»');
                return;
            }
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                __RV_audioChunks = [];
                const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg';
                __RV_mediaRecorder = new MediaRecorder(stream, { mimeType: mime });
                __RV_mediaRecorder.ondataavailable = (ev) => { if (ev.data.size > 0) __RV_audioChunks.push(ev.data); };
                __RV_mediaRecorder.onerror = (ev) => {
                    console.error('MediaRecorder error:', ev.error);
                    alert('Ошибка записи');
                    stream.getTracks().forEach(t => t.stop());
                    __RV_resetBtn(btn);
                };
                __RV_mediaRecorder.onstop = async () => {
                    if (__RV_recordTimeout) { clearTimeout(__RV_recordTimeout); __RV_recordTimeout = null; }
                    stream.getTracks().forEach(t => t.stop());
                    const blob = new Blob(__RV_audioChunks, { type: mime });
                    if (blob.size === 0) { alert('Запись пустая'); __RV_resetBtn(btn); return; }
                    try { await __RV_uploadAudio(blob); }
                    catch (e) { console.error(e); }
                    finally { __RV_resetBtn(btn); }
                };
                __RV_mediaRecorder.start(1000);
                __RV_isRecording = true;
                btn.innerHTML = '⏹';
                btn.style.color = '#c11f2b';
                __RV_recordTimeout = setTimeout(() => {
                    if (__RV_isRecording) {
                        alert('Достигнут лимит записи (5 минут). Запись остановлена.');
                        __RV_stopRecording(btn);
                    }
                }, __RV_MAX_RECORD_MS);
            } catch (err) {
                alert('Нет доступа к микрофону: ' + err.message);
                __RV_resetBtn(btn);
            }
        }

        function __RV_stopRecording(btn) {
            if (__RV_recordTimeout) { clearTimeout(__RV_recordTimeout); __RV_recordTimeout = null; }
            if (__RV_mediaRecorder && __RV_mediaRecorder.state === 'recording') {
                try { __RV_mediaRecorder.requestData(); } catch (e) { }
                __RV_mediaRecorder.stop();
            }
            __RV_isRecording = false;
            btn.innerHTML = '⏳';
            btn.style.color = '#a0a0cc';
        }

        function __RV_resetBtn(btn) {
            __RV_isRecording = false;
            if (__RV_recordTimeout) { clearTimeout(__RV_recordTimeout); __RV_recordTimeout = null; }
            if (!btn) return;
            btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z"/></svg>';
            btn.style.color = '#a0a0cc';
        }

        function __RV_uploadAudio(blob) {
            return new Promise((resolve, reject) => {
                const apiKey = __RV_getApiKey();
                if (!apiKey) { alert('API-ключ не указан'); reject(); return; }
                const ext = blob.type === 'audio/ogg' ? 'ogg' : 'webm';
                const fileName = 'voice_' + Date.now() + '.' + ext;
                const formData = new FormData();
                formData.append('file', blob, fileName);
                GM_xmlhttpRequest({
                    method: 'POST', url: __RV_API_URL,
                    headers: { 'Authorization': 'Bearer ' + apiKey },
                    data: formData, timeout: 30000,
                    onload: (resp) => {
                        if (resp.status < 200 || resp.status >= 300) { alert('Ошибка dbimg: ' + resp.status + '\n' + resp.responseText); reject(); return; }
                        let data;
                        try { data = JSON.parse(resp.responseText); }
                        catch (e) { alert('Не удалось распарсить ответ: ' + resp.responseText); reject(); return; }
                        let shortId = data.shortId || '';
                        let directUrl = __RV_sanitizeUrl(data.directUrl || data.mediaUrl || '');
                        if (!directUrl && shortId) directUrl = 'https://cdn.dbimg.app/' + shortId + '.' + ext;
                        if (!directUrl) { alert('В ответе нет directUrl/shortId. Ответ: ' + resp.responseText); reject(); return; }
                        const m = directUrl.match(/\/([a-zA-Z0-9]+)\.([a-zA-Z0-9]+)$/);
                        if (!m) { alert('Не удалось извлечь shortId из URL: ' + directUrl); reject(); return; }
                        const code = '<voice_' + m[1] + '.' + m[2] + '>';
                        __RV_insertCodeToChat(code);
                        resolve();
                    },
                    onerror: () => { alert('Сеть: dbimg не отвечает'); reject(); },
                    ontimeout: () => { alert('Таймаут dbimg'); reject(); }
                });
            });
        }

        async function __RV_insertCodeToChat(code) {
            const input = document.querySelector('[data-a-target="chat-input"][contenteditable="true"]');
            if (!input) return;
            input.focus();
            try {
                const clipboardData = new DataTransfer();
                clipboardData.setData('text/plain', code);
                const pasteEvent = new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: clipboardData });
                input.dispatchEvent(pasteEvent);
                await new Promise(r => setTimeout(r, 100));
                return;
            } catch (e) { console.warn('Clipboard paste failed:', e); }
            try { document.execCommand('insertText', false, code); }
            catch (e) {
                const sel = window.getSelection();
                if (sel.rangeCount) {
                    const range = sel.getRangeAt(0);
                    range.deleteContents();
                    range.insertNode(document.createTextNode(code));
                }
            }
            input.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertText', data: code }));
        }
        function __RV_processAllAudio() {
            document.querySelectorAll('.chat-line__message').forEach(__RV_processVoiceMessageReal);
        }

        function __RV_removeAllAudio() {

            document.querySelectorAll('.ripper-voice-player').forEach(el => {
                const ext = el.dataset.voiceShortExt;
                if (ext) {
                    const txt = document.createTextNode(`<voice_${ext}>`);
                    if (el.parentNode) el.parentNode.replaceChild(txt, el);
                } else {
                    el.remove();
                }
            });

            document.querySelectorAll('.chat-line__message').forEach(el => {
                delete el.dataset.ripperVoiceDone;
            });
        }

        window.__RV_processAllAudio = __RV_processAllAudio;
        window.__RV_removeAllAudio = __RV_removeAllAudio;
        window.__RV_toggleMenu = __RV_toggleMenu;
        window.__RV_stopRecording = __RV_stopRecording;
        window.__RV_resetBtn = __RV_resetBtn;
        window.__RV_startRecording = __RV_startRecording;
        Object.defineProperty(window, '__RV_isRecording', { get: () => __RV_isRecording });
        __RV_injectPlayerStyles();
        __RV_observeChatForVoice();

    })();

})();