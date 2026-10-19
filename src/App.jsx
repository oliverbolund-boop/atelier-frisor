import React from 'react';
import { copy, services, addons as ADDONS, stylists, gallery, reviews, legal, amounts } from './content.js';

// Lille hjælper: gør en CSS-tekst ("color:#fff;font-size:12px") til et React-style-objekt.
const styleCache = new Map();
function st(css) {
  if (!css) return undefined;
  if (styleCache.has(css)) return styleCache.get(css);
  const out = {};
  css.split(';').forEach((decl) => {
    const i = decl.indexOf(':');
    if (i < 0) return;
    const prop = decl.slice(0, i).trim();
    const val = decl.slice(i + 1).trim();
    if (!prop) return;
    const key = prop.startsWith('--') ? prop : prop.replace(/^-webkit-/, 'Webkit-').replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    out[key] = val;
  });
  styleCache.set(css, out);
  return out;
}

const Check = () => (
  <svg width="56" height="56" viewBox="0 0 56 56" fill="none" stroke="#ededed" strokeWidth="1" aria-hidden="true"><circle cx="28" cy="28" r="27" /><path d="M18 29l7 7 13-15" /></svg>
);

function Smoke({ animated }) {
  const id = animated ? 'smoke' : 'smokeStill';
  return (
    <svg viewBox="0 0 900 560" preserveAspectRatio="xMidYMid slice" aria-hidden="true" style={st('position:absolute;top:-40px;left:50%;transform:translateX(-50%);width:1100px;max-width:170%;height:640px;pointer-events:none')}>
      <defs>
        <filter id={id} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.0055 0.0075" numOctaves="5" seed="7">
            {animated && <animate attributeName="baseFrequency" dur="40s" values="0.0055 0.0075;0.0065 0.0062;0.0055 0.0075" repeatCount="indefinite" />}
          </feTurbulence>
          <feColorMatrix type="matrix" values="0 0 0 0 0.85  0 0 0 0 0.85  0 0 0 0 0.85  2.1 0 0 0 -0.78" />
        </filter>
        <radialGradient id={id + 'Fade'} cx="50%" cy="38%" r="50%">
          <stop offset="0%" stopColor="#fff" /><stop offset="55%" stopColor="#fff" stopOpacity="0.75" /><stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <mask id={id + 'Mask'}><rect width="900" height="560" fill={'url(#' + id + 'Fade)'} /></mask>
      </defs>
      <g mask={'url(#' + id + 'Mask)'}><rect width="900" height="560" filter={'url(#' + id + ')'} opacity="0.62" /></g>
    </svg>
  );
}

export default class App extends React.Component {
  constructor(props) {
    super(props);
    this.copy = copy; this.services = services; this.addons = ADDONS; this.stylists = stylists;
    this.gallery = gallery; this.reviews = reviews; this.legal = legal; this.amounts = amounts;
    let reduce = false;
    try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
    this.reduce = reduce;
    let saved = null;
    try { saved = JSON.parse(window.localStorage.getItem('atelier.me') || 'null'); } catch (e) {}
    this.state = {
      lang: 'da', view: 'home', legal: 'privacy', step: 1, service: null, addons: [], stylist: null, assigned: null, day: null, time: null,
      name: (saved && saved.name) || '', phone: (saved && saved.phone) || '', email: (saved && saved.email) || '', note: '',
      remember: true, welcome: !!(saved && saved.name), ref: '', y: 0, gift: 500, giftDone: false, calMsg: '', wl: {}
    };
    this.onScroll = this.onScroll.bind(this);
  }

  componentDidMount() { window.addEventListener('scroll', this.onScroll, { passive: true }); }
  componentWillUnmount() {
    window.removeEventListener('scroll', this.onScroll);
    if (this.raf) cancelAnimationFrame(this.raf);
    clearTimeout(this.adv);
  }
  onScroll() {
    if (this.raf) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = null;
      const y = Math.round(window.scrollY || 0);
      if (Math.abs(y - this.state.y) > 2 || (y < 3 && this.state.y !== 0)) this.setState({ y });
    });
  }

  makeDays(T) {
    const out = [];
    const base = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
      const g = d.getDay();
      out.push({
        id: i, g, num: String(d.getDate()), wd: i === 0 ? T.today : T.wd[g], mon: T.mon[d.getMonth()],
        label: this.state.lang === 'da' ? T.wdLong[g] + ' ' + d.getDate() + '. ' + T.monLong[d.getMonth()] : T.wdLong[g] + ' ' + d.getDate() + ' ' + T.monLong[d.getMonth()],
        y: d.getFullYear(), m: d.getMonth() + 1, dd: d.getDate(), closed: g === 0, sat: g === 6, today: i === 0
      });
    }
    return out;
  }

  // Demo: ledige tider er pseudo-tilfældige, men stabile for den samme dag.
  isFree(dayIdx, slotIdx, seed) {
    const h = Math.imul(dayIdx * 37 + slotIdx * 11 + seed * 17 + 5, 2654435761) >>> 0;
    return (h % 7) >= 3;
  }

  fmtTime(m) {
    const hh = String(Math.floor(m / 60)).padStart(2, '0'), mm = String(m % 60).padStart(2, '0');
    return this.state.lang === 'da' ? hh + '.' + mm : hh + ':' + mm;
  }

  slots(day, dur, stylistId) {
    if (!day || day.closed) return [];
    const start = day.sat ? 540 : 600, end = day.sat ? 900 : 1080;
    const now = new Date(), nowMin = now.getHours() * 60 + now.getMinutes();
    const pool = (stylistId && stylistId !== 'any' ? this.stylists.filter(x => x.id === stylistId) : this.stylists.filter(x => x.id !== 'any'))
      .filter(x => x.off.indexOf(day.g) < 0);
    const out = [];
    let i = 0;
    for (let m = start; m + dur <= end; m += 30, i++) {
      const past = day.today && m <= nowMin + 30;
      const who = past ? null : pool.find(sty => this.isFree(day.id, i, sty.seed));
      out.push({ label: this.fmtTime(m), mins: m, free: !!who, who: who ? who.id : null });
    }
    return out;
  }

  fmtKr(n) {
    const s = n >= 1000 ? Math.floor(n / 1000) + (this.state.lang === 'da' ? '.' : ',') + String(n % 1000).padStart(3, '0') : String(n);
    return this.state.lang === 'da' ? s + ' kr' : 'DKK ' + s;
  }
  fmtPrice(n, from) { return (from ? (this.state.lang === 'da' ? 'fra ' : 'from ') : '') + this.fmtKr(n); }

  scrollTop() { try { window.scrollTo(0, 0); } catch (e) {} }

  goSection(id) {
    const go = () => { const el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: this.reduce ? 'auto' : 'smooth', block: 'start' }); };
    if (this.state.view !== 'home') { this.setState({ view: 'home' }); setTimeout(go, 60); } else go();
  }

  openBooking(patch) {
    const fresh = this.state.step === 5;
    const base = fresh ? { service: null, addons: [], stylist: null, assigned: null, day: null, time: null, ref: '', calMsg: '' } : {};
    const p = Object.assign({ view: 'booking' }, base, patch || {});
    if (p.step == null) {
      const s = Object.assign({}, this.state, p);
      p.step = !s.service ? 1 : !s.stylist ? 2 : 3;
    }
    this.setState(p);
    this.scrollTop();
  }

  openLegal(which) { this.setState({ view: 'legal', legal: which }); this.scrollTop(); }

  pickStylist(id) {
    this.setState({ stylist: id, time: null, assigned: null });
    clearTimeout(this.adv);
    this.adv = setTimeout(() => {
      const sty = this.stylists.find(x => x.id === id);
      const d = this.state.day;
      const g = d != null ? new Date(Date.now() + d * 86400000).getDay() : null;
      const patch = { step: 3 };
      if (sty && g != null && sty.off.indexOf(g) >= 0) patch.day = null;
      this.setState(patch);
      this.scrollTop();
    }, 260);
  }

  saveMe() {
    try {
      if (this.state.remember) window.localStorage.setItem('atelier.me', JSON.stringify({ name: this.state.name, phone: this.state.phone, email: this.state.email }));
      else window.localStorage.removeItem('atelier.me');
    } catch (e) {}
  }

  addToCalendar(title, day, slot, dur, ref, T) {
    try {
      const pad = n => String(n).padStart(2, '0');
      const stamp = (mins) => day.y + pad(day.m) + pad(day.dd) + 'T' + pad(Math.floor(mins / 60)) + pad(mins % 60) + '00';
      const ics = [
        'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Atelier//Booking//DA', 'BEGIN:VEVENT',
        'UID:' + ref + '@atelier', 'DTSTART:' + stamp(slot.mins), 'DTEND:' + stamp(slot.mins + dur),
        'SUMMARY:' + title, 'LOCATION:Atelier\\, [Adresse]\\, København', 'DESCRIPTION:Booking ' + ref,
        'END:VEVENT', 'END:VCALENDAR'
      ].join('\r\n');
      const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
      const a = document.createElement('a');
      a.href = url; a.download = 'atelier-' + ref + '.ics';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      this.setState({ calMsg: T.calOk });
    } catch (e) {
      this.setState({ calMsg: T.calFail });
    }
  }

  optStyle(sel, extra) {
    return 'display:flex;justify-content:space-between;align-items:center;gap:16px;width:100%;text-align:left;padding:18px 22px;min-height:72px;font:inherit;cursor:pointer;transition:background .2s,color .2s,border-color .2s;border:1px solid ' +
      (sel ? '#ededed;background:#ededed;color:#050505' : '#2a2a2a;background:transparent;color:#ededed') + ';' + (extra || '');
  }

  renderVals() {
    const s = this.state, L = s.lang, T = this.copy[L];
    const days = this.makeDays(T);
    const svc = this.services.find(x => x.id === s.service) || null;
    const sty = this.stylists.find(x => x.id === s.stylist) || null;
    const day = days.find(x => x.id === s.day) || null;
    const addons = this.addons.filter(a => s.addons.indexOf(a.id) >= 0);
    const dur = (svc ? svc.min : 60) + addons.reduce((n, a) => n + a.min, 0);
    const total = svc ? svc.p + addons.reduce((n, a) => n + a.p, 0) : 0;
    const isHome = s.view === 'home', isBooking = s.view === 'booking', isLegal = s.view === 'legal';

    const tt = Math.min(1, s.y / 520), e = tt * tt * (3 - 2 * tt);
    const ls = (0.55 - 0.3 * e).toFixed(3);
    const hb = isHome ? Math.min(1, s.y / 320) : 1;
    const lo = isHome ? Math.max(0, Math.min(1, (s.y - 260) / 220)) : 1;
    const showBar = isHome && s.y > 480;

    let nextFree = null;
    for (const d of days) {
      const sl = this.slots(d, 60, 'any').find(x => x.free);
      if (sl) { nextFree = { d, sl }; break; }
    }
    const relDay = (d) => d.id === 0 ? T.today : d.id === 1 ? T.tomorrow : T.wdLong[d.g];
    const nextFreeLabel = nextFree ? relDay(nextFree.d) + ' ' + T.at + ' ' + nextFree.sl.label : '';

    const slots = this.slots(day, dur, s.stylist);
    const slot = slots.find(x => x.mins === s.time) || null;
    const assigned = this.stylists.find(x => x.id === s.assigned) || null;
    const step = s.step;
    const digits = (s.phone.match(/\d/g) || []).length;
    const nameOk = s.name.trim().length > 1, phoneOk = digits >= 8;
    const canNext = step === 1 ? !!svc : step === 2 ? !!sty : step === 3 ? !!(day && slot) : step === 4 ? (nameOk && phoneOk) : false;
    const H = T.hints;
    const hint = canNext ? '' : step === 1 ? H.s1 : step === 2 ? H.s2 : step === 3 ? (!day ? H.s3day : H.s3time) :
      step === 4 ? (!nameOk && !phoneOk ? H.both : !nameOk ? H.name : H.phone) : '';

    const styName = (x) => x.name || x[L][0];
    const styLabel = sty ? (sty.id === 'any' ? (assigned ? assigned.name + ' (' + T.firstFree + ')' : sty[L][0]) : sty.name) : '—';
    const when = day ? (day.label + (slot ? ', ' + T.at + ' ' + slot.label : '')) : '—';
    const row = (k, v) => ({ k, v, style: 'margin:0;font-size:16px;line-height:1.5;color:' + (v === '—' ? '#5f5f5f' : '#ededed') });
    const amtStyle = (sel) => 'height:56px;font:inherit;font-size:17px;cursor:pointer;transition:background .2s,color .2s;border:1px solid ' + (sel ? '#ededed;background:#ededed;color:#050505' : '#2a2a2a;background:transparent;color:#ededed');
    const offText = (x) => x.off.length ? T.off + ': ' + x.off.map(g => T.wdPlural[g]).join(L === 'da' ? ' og ' : ' and ') : '';

    const navIds = ['behandlinger', 'frisorer', 'galleri', 'gavekort', 'kontakt'];
    const shortIds = ['behandlinger', 'gavekort', 'kontakt'];
    const mkNav = (labels, ids) => labels.map((label, i) => ({ label, href: '#' + ids[i], go: (ev) => { if (ev) ev.preventDefault(); this.goSection(ids[i]); } }));
    const legalDoc = this.legal[s.legal] || this.legal.privacy;
    const legalNames = { privacy: T.privacy, cookies: 'Cookies', terms: T.terms };
    const wlKey = day ? String(day.id) + ':' + (s.stylist || 'any') : '';
    const wlJoined = !!(wlKey && s.wl[wlKey]);

    return {
      t: T, motion: !this.reduce,
      isHome, isBooking, isLegal,
      headerStyle: 'position:fixed;top:0;left:0;right:0;z-index:50;background:rgba(5,5,5,' + (hb * 0.92).toFixed(2) + ');backdrop-filter:blur(' + (hb * 10).toFixed(1) + 'px);-webkit-backdrop-filter:blur(' + (hb * 10).toFixed(1) + 'px);border-bottom:1px solid rgba(255,255,255,' + (hb * 0.07).toFixed(3) + ')',
      logoStyle: "font-family:'Josefin Sans',sans-serif;font-weight:300;font-size:15px;letter-spacing:0.5em;padding:14px 0;white-space:nowrap;opacity:" + lo.toFixed(2) + ';transition:opacity .2s',
      heroWordStyle: 'margin:0 -' + ls + "em 0 0;font-family:'Josefin Sans',sans-serif;font-weight:100;font-size:clamp(32px,9vw,124px);line-height:1;text-transform:uppercase;letter-spacing:" + ls + 'em;opacity:' + (1 - 0.65 * e).toFixed(2),
      mbarStyle: 'position:fixed;left:0;right:0;bottom:0;z-index:60;padding:12px 20px calc(12px + env(safe-area-inset-bottom));background:rgba(5,5,5,0.92);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border-top:1px solid #1f1f1f;transition:transform .35s ease;transform:translateY(' + (showBar ? '0' : '110%') + ')',
      mbarTab: showBar ? 0 : -1,

      toggleLang: () => {
        const lang = L === 'da' ? 'en' : 'da';
        try { document.documentElement.lang = lang; } catch (e) {}
        this.setState({ lang });
      },
      navItems: mkNav(T.nav, navIds), navShort: mkNav(T.navShort, shortIds),
      navSvc: (ev) => { if (ev) ev.preventDefault(); this.goSection('behandlinger'); },
      goHome: (ev) => { if (ev) ev.preventDefault(); this.setState({ view: 'home', y: 0 }); this.scrollTop(); },
      openBlank: () => this.openBooking({}),
      noop: (ev) => { if (ev) ev.preventDefault(); },
      openPrivacy: (ev) => { if (ev) ev.preventDefault(); this.openLegal('privacy'); },
      openCookies: (ev) => { if (ev) ev.preventDefault(); this.openLegal('cookies'); },
      openTerms: (ev) => { if (ev) ev.preventDefault(); this.openLegal('terms'); },

      hasNextFree: !!nextFree, nextFreeLabel,
      bookNextFree: () => this.openBooking(nextFree ? { day: nextFree.d.id } : {}),

      how: T.how.map((h, i) => ({ n: '0' + (i + 1), title: h[0], text: h[1] })),
      menu: this.services.map(x => {
        const price = this.fmtPrice(x.p, x.from);
        return { id: x.id, name: x[L][0], desc: x[L][1], dur: x.min + ' min', price, aria: T.bookShort + ' ' + x[L][0] + ', ' + price, book: () => this.openBooking({ service: x.id, time: null, step: null }) };
      }),
      team: this.stylists.filter(x => x.id !== 'any').map(x => ({
        id: x.id, name: x.name, role: x[L][0], bio: x[L][1], img: x.img, srcset: x.small + ' 480w, ' + x.img + ' 900w', alt: x.name,
        offLabel: offText(x), bookLabel: T.bookShort + ' ' + x.name,
        book: () => this.openBooking({ stylist: x.id, time: null, assigned: null, step: null })
      })),
      gallery: this.gallery.map(g => ({ cap: g[L][0], alt: g[L][1], img: g.img, srcset: g.small + ' 480w, ' + g.img + ' 900w' })),
      reviews: this.reviews[L],

      amounts: this.amounts.map(n => ({ n, label: this.fmtKr(n), sel: s.gift === n, style: amtStyle(s.gift === n), pick: () => this.setState({ gift: n }) })),
      giftDone: s.giftDone, giftDoneTitle: T.giftDoneTitle.replace('{x}', this.fmtKr(s.gift)),
      orderGift: () => this.setState({ giftDone: true }),
      giftReset: () => this.setState({ giftDone: false }),

      inFlow: isBooking && step < 5, done: isBooking && step === 5,
      stepLabel: T.stepWord + ' ' + step + ' ' + T.ofWord + ' 4', stepTitle: T.titles[step - 1] || '',
      step,
      stepTabs: T.tabs.map((label, i) => ({
        label, style: 'font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:' + (i + 1 === step ? '#ededed' : i + 1 < step ? '#9a9a9a' : '#6a6a6a')
      })),
      progressStyle: 'position:absolute;left:0;top:-1px;height:3px;background:#ededed;transition:width .5s cubic-bezier(.2,.7,.2,1);width:' + (step * 25) + '%',

      svcOpts: this.services.map(x => ({
        id: x.id, name: x[L][0], dur: x.min + ' min', price: this.fmtPrice(x.p, x.from), sel: x.id === s.service, style: this.optStyle(x.id === s.service),
        pick: () => this.setState({ service: x.id, time: null, assigned: null })
      })),
      addonOpts: this.addons.map(a => {
        const sel = s.addons.indexOf(a.id) >= 0;
        return {
          id: a.id, name: a[L], meta: '+ ' + a.min + ' min · + ' + this.fmtKr(a.p), sel,
          style: 'display:flex;align-items:center;gap:14px;width:100%;text-align:left;padding:14px 16px;min-height:64px;font:inherit;cursor:pointer;background:transparent;color:#ededed;border:1px solid ' + (sel ? '#ededed' : '#2a2a2a') + ';transition:border-color .2s',
          boxStyle: 'width:22px;height:22px;flex:0 0 auto;display:flex;align-items:center;justify-content:center;border:1px solid ' + (sel ? '#ededed;background:#ededed;color:#050505' : '#5a5a5a;background:transparent;color:transparent'),
          toggle: () => this.setState({ addons: sel ? s.addons.filter(id => id !== a.id) : s.addons.concat(a.id), time: null, assigned: null })
        };
      }),
      styOpts: this.stylists.map(x => ({
        id: x.id, name: styName(x), role: (x.id === 'any' ? x[L][1] : x[L][0]) + (x.off.length ? ' · ' + offText(x) : ''), imgSmall: x.small || '', isAny: x.id === 'any',
        sel: x.id === s.stylist, style: this.optStyle(x.id === s.stylist, 'min-height:96px'), pick: () => this.pickStylist(x.id)
      })),
      dayOpts: days.map(d => {
        const sel = d.id === s.day;
        const styOff = !!(sty && sty.id !== 'any' && sty.off.indexOf(d.g) >= 0);
        const off = d.closed || styOff;
        return {
          id: d.id, wd: d.wd, num: d.num, sel, off, sub: d.closed ? T.closedShort : styOff ? T.offShort : d.mon,
          aria: d.label + (d.closed ? ', ' + T.closedShort : styOff ? ', ' + sty.name + ' ' + T.offShort : ''),
          style: 'flex:0 0 auto;width:72px;height:92px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;font:inherit;border:1px solid ' +
            (sel ? '#ededed;background:#ededed;color:#050505;cursor:pointer' : off ? '#161616;background:transparent;color:#4a4a4a;cursor:not-allowed' : '#2a2a2a;background:transparent;color:#ededed;cursor:pointer') + ';transition:background .2s,color .2s',
          pick: () => this.setState({ day: d.id, time: null, assigned: null })
        };
      }),
      dayHeading: day ? '· ' + day.label : '',
      noDay: !day, dayNoSlots: !!day && !slots.some(x => x.free),
      wlJoined, wlDisabled: !phoneOk,
      wlBtnStyle: 'height:48px;padding:0 22px;font:inherit;font-size:12px;letter-spacing:0.22em;text-transform:uppercase;border:1px solid ' + (phoneOk ? '#ededed;background:#ededed;color:#050505;cursor:pointer' : '#2a2a2a;background:transparent;color:#5a5a5a;cursor:not-allowed'),
      wlDoneText: day ? T.wlDone.replace('{d}', day.label).replace('{p}', s.phone) : '',
      joinWaitlist: () => { if (!phoneOk) return; this.setState({ wl: Object.assign({}, s.wl, { [wlKey]: true }) }); },
      timeOpts: slots.map(x => {
        const sel = !!slot && x.mins === slot.mins;
        return {
          mins: x.mins, label: x.label, taken: !x.free, sel, aria: T.at + ' ' + x.label + (x.free ? '' : ', ' + T.taken),
          style: 'height:48px;font:inherit;font-size:16px;border:1px solid ' +
            (sel ? '#ededed;background:#ededed;color:#050505;cursor:pointer' : x.free ? '#2a2a2a;background:transparent;color:#ededed;cursor:pointer' : '#141414;background:transparent;color:#454545;text-decoration:line-through;cursor:not-allowed') + ';transition:background .2s,color .2s',
          pick: () => this.setState({ time: x.mins, assigned: x.who })
        };
      }),

      welcomeBack: s.welcome,
      fName: s.name, fPhone: s.phone, fMail: s.email, fNote: s.note, remember: s.remember,
      onName: (ev) => this.setState({ name: ev.target.value }),
      onPhone: (ev) => this.setState({ phone: ev.target.value }),
      onMail: (ev) => this.setState({ email: ev.target.value }),
      onNote: (ev) => this.setState({ note: ev.target.value }),
      onRemember: (ev) => this.setState({ remember: !!ev.target.checked }),

      hint,
      backLabel: step === 1 ? T.cancel : T.backBtn,
      back: () => { if (step === 1) { this.setState({ view: 'home' }); } else { this.setState({ step: step - 1 }); } this.scrollTop(); },
      nextLabel: step === 4 ? T.confirm : T.cont,
      nextDisabled: !canNext,
      nextStyle: 'height:52px;padding:0 28px;font:inherit;font-size:12px;letter-spacing:0.24em;text-transform:uppercase;white-space:nowrap;border:1px solid ' +
        (canNext ? '#ededed;background:#ededed;color:#050505;cursor:pointer' : '#2a2a2a;background:transparent;color:#5a5a5a;cursor:not-allowed'),
      next: () => {
        if (!canNext) return;
        if (step === 4) { this.saveMe(); this.setState({ step: 5, ref: 'AT-' + (1000 + Math.floor(Math.random() * 9000)), calMsg: '', welcome: s.remember }); }
        else this.setState({ step: step + 1 });
        this.scrollTop();
      },

      summary: [
        row(T.sTreat, svc ? svc[L][0] + ' · ' + dur + ' min' : '—'),
        row(T.sAddons, addons.length ? addons.map(a => a[L]).join(', ') : '—'),
        row(T.sSty, styLabel),
        row(T.sWhen, when)
      ],
      sumPrice: svc ? this.fmtPrice(total, svc.from) : '—',

      ref: s.ref,
      thanks: T.thanks.replace('{n}', s.name.trim().split(' ')[0] || ''),
      doneLine: T.doneLine.replace('{p}', s.phone),
      calMsg: s.calMsg,
      addCal: () => {
        if (!(svc && day && slot)) return;
        const who = assigned ? assigned.name : (sty && sty.id !== 'any' ? sty.name : '');
        this.addToCalendar(svc[L][0] + ' – Atelier' + (who ? ' (' + who + ')' : ''), day, slot, dur, s.ref, T);
      },
      again: () => { this.setState({ step: 1, service: null, addons: [], stylist: null, assigned: null, day: null, time: null, ref: '', calMsg: '' }); this.scrollTop(); },

      legalTitle: legalDoc.title, legalEnNote: L === 'en',
      legalSections: legalDoc.sections.map(x => ({ h: x[0], p: x[1] })),
      legalLinks: Object.keys(this.legal).filter(k => k !== s.legal).map(k => ({ k, label: legalNames[k], go: () => this.openLegal(k) }))
    };
  }

  render() {
    const v = this.renderVals();
    const t = v.t;
    const navLink = st('font-size:12px;letter-spacing:0.22em;text-transform:uppercase;color:#bdbdbd;padding:14px 0');
    const btnSm = 'font-size:12px;letter-spacing:0.26em;text-transform:uppercase';

    return (
      <div style={st('min-height:100vh;background:#050505;color:#ededed;overflow-x:hidden')}>

        {/* Header */}
        <header style={st(v.headerStyle)}>
          <div className="wrap" style={st('display:flex;align-items:center;justify-content:space-between;height:76px;gap:16px')}>
            <a href="#top" onClick={v.goHome} aria-label={t.logoAria} style={st(v.logoStyle)}>ATELIER</a>
            <div style={st('display:flex;align-items:center;gap:20px')}>
              {v.isHome && (
                <nav aria-label={t.navAria} style={st('display:flex;align-items:center;gap:30px')}>
                  <div className="navd" style={st('gap:30px;align-items:center')}>
                    {v.navItems.map(n => <a key={n.href} href={n.href} onClick={n.go} style={navLink}>{n.label}</a>)}
                  </div>
                  <div className="navt" style={st('gap:26px;align-items:center')}>
                    {v.navShort.map(n => <a key={n.href} href={n.href} onClick={n.go} style={navLink}>{n.label}</a>)}
                  </div>
                </nav>
              )}
              <button className="lang" onClick={v.toggleLang} aria-label={t.langAria}>{t.langBtn}</button>
              {v.isHome ? (
                <button className="ghost" onClick={v.openBlank} style={st('height:44px;padding:0 18px;font-size:12px;letter-spacing:0.22em;text-transform:uppercase;white-space:nowrap')}>{t.book}</button>
              ) : (
                <button className="ghost" onClick={v.goHome} style={st('height:44px;padding:0 10px;display:flex;align-items:center;gap:10px;font-size:12px;letter-spacing:0.22em;text-transform:uppercase;border-color:transparent')}>
                  {t.close}
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13" /></svg>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* ===================== FORSIDE ===================== */}
        {v.isHome && (
          <main id="top" className="fade">
            <section className="hero" style={st('position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 20px;overflow:hidden')}>
              <Smoke animated={v.motion} />
              <svg aria-hidden="true" style={st('position:absolute;inset:0;width:100%;height:100%;pointer-events:none;opacity:0.07')}>
                <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" /><feColorMatrix type="saturate" values="0" /></filter>
                <rect width="100%" height="100%" filter="url(#grain)" />
              </svg>
              <div style={st('position:relative;display:flex;flex-direction:column;align-items:center;gap:30px;margin-top:120px')}>
                <h1 style={st(v.heroWordStyle)}>Atelier</h1>
                <p style={st('margin:0;font-size:18px;color:#9a9a9a;letter-spacing:0.04em;max-width:520px;line-height:1.6')}>{t.heroSub}</p>
                <div style={st('display:flex;gap:14px;flex-wrap:wrap;justify-content:center;margin-top:10px')}>
                  <button className="solid" onClick={v.openBlank} style={st('height:52px;padding:0 34px;' + btnSm)}>{t.book}</button>
                  <a className="ghost" href="#behandlinger" onClick={v.navSvc} style={st('height:52px;padding:0 30px;display:inline-flex;align-items:center;' + btnSm)}>{t.seePrices}</a>
                </div>
                {v.hasNextFree && (
                  <button onClick={v.bookNextFree} style={st('margin-top:4px;background:transparent;border:0;color:#bdbdbd;font:inherit;font-size:14px;letter-spacing:0.06em;cursor:pointer;min-height:44px;display:inline-flex;align-items:center;gap:12px')}>
                    <span aria-hidden="true" style={st('width:7px;height:7px;border-radius:50%;background:#ededed;display:inline-block')} />
                    {t.nextFree}: <span style={st('color:#ededed;border-bottom:1px solid #5a5a5a;padding-bottom:2px')}>{v.nextFreeLabel}</span>
                  </button>
                )}
              </div>
              <div aria-hidden="true" style={st('position:absolute;bottom:36px;left:50%;transform:translateX(-50%);width:1px;height:56px;background:#3a3a3a')} />
            </section>

            {/* Intro */}
            <section className="wrap sec" style={st('padding-top:110px')}>
              <p className="eyebrow" style={st('margin-bottom:32px')}>{t.salonEyebrow}</p>
              <p style={st("margin:0;font-family:'Josefin Sans',sans-serif;font-weight:200;font-size:clamp(24px,3.6vw,46px);line-height:1.38;max-width:980px;color:#ededed")}>{t.intro}</p>
              <div style={st('margin-top:72px;aspect-ratio:16 / 9;overflow:hidden;background:#0b0b0b')}>
                <img src="/img/salon.jpg" srcSet="/img/salon_s.jpg 800w, /img/salon.jpg 1600w" sizes="(max-width: 1200px) 100vw, 1072px" alt={t.salonAlt} loading="lazy" style={st('width:100%;height:100%;object-fit:cover;display:block')} />
              </div>
            </section>

            {/* Sådan arbejder vi */}
            <section id="metode" className="wrap sec">
              <p className="eyebrow">01 · {t.howEyebrow}</p>
              <h2 className="h2" style={st('margin-bottom:60px')}>{t.howTitle}</h2>
              <div className="how">
                {v.how.map(h => (
                  <article key={h.n} style={st('border-top:1px solid #262626;padding-top:28px;display:flex;flex-direction:column;gap:16px')}>
                    <span style={st("font-family:'Josefin Sans',sans-serif;font-weight:100;font-size:56px;line-height:1;color:#5f5f5f")}>{h.n}</span>
                    <h3 style={st("margin:0;font-family:'Josefin Sans',sans-serif;font-weight:300;font-size:22px;letter-spacing:0.24em;text-transform:uppercase")}>{h.title}</h3>
                    <p style={st('margin:0;color:#9a9a9a;font-size:16px;line-height:1.7')}>{h.text}</p>
                  </article>
                ))}
              </div>
            </section>

            {/* Behandlinger */}
            <section id="behandlinger" className="wrap sec">
              <div style={st('display:flex;justify-content:space-between;align-items:flex-end;gap:24px;flex-wrap:wrap;margin-bottom:44px')}>
                <div>
                  <p className="eyebrow">02 · {t.svcEyebrow}</p>
                  <h2 className="h2">{t.svcTitle}</h2>
                </div>
                <p style={st('margin:0;color:#8a8a8a;font-size:15px;max-width:320px;line-height:1.6')}>{t.svcSub}</p>
              </div>
              <div style={st('border-bottom:1px solid #1f1f1f')}>
                {v.menu.map(m => (
                  <button key={m.id} className="svc" onClick={m.book} aria-label={m.aria}>
                    <span style={st('display:flex;flex-direction:column;gap:8px;min-width:0')}>
                      <span className="svc-name">{m.name}</span>
                      <span style={st('font-size:15px;color:#8a8a8a;line-height:1.5')}>{m.desc}</span>
                    </span>
                    <span className="svc-dur" style={st('font-size:13px;letter-spacing:0.18em;text-transform:uppercase;color:#8a8a8a;white-space:nowrap')}>{m.dur}</span>
                    <span style={st('display:flex;align-items:center;gap:20px;justify-content:flex-end;white-space:nowrap')}>
                      <span style={st('font-size:20px;font-weight:400')}>{m.price}</span>
                      <span className="svc-go" aria-hidden="true" style={st('font-size:11px;letter-spacing:0.26em;text-transform:uppercase;border-bottom:1px solid #ededed;padding-bottom:2px')}>{t.bookShort}</span>
                    </span>
                  </button>
                ))}
              </div>
            </section>

            {/* Frisører */}
            <section id="frisorer" className="wrap sec">
              <p className="eyebrow">03 · {t.teamEyebrow}</p>
              <h2 className="h2" style={st('margin-bottom:52px')}>{t.teamTitle}</h2>
              <div className="team">
                {v.team.map(p => (
                  <article key={p.id} className="member" style={st('display:flex;flex-direction:column;gap:16px')}>
                    <div className="tile">
                      <img src={p.img} srcSet={p.srcset} sizes="(max-width: 639px) 100vw, 33vw" alt={p.alt} loading="lazy" style={st('width:100%;height:100%;object-fit:cover;display:block')} />
                    </div>
                    <div className="mhead" style={st('display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap')}>
                      <h3 style={st("margin:0;font-family:'Josefin Sans',sans-serif;font-weight:300;font-size:26px;letter-spacing:0.3em;text-transform:uppercase")}>{p.name}</h3>
                      <button className="ghost" onClick={p.book} style={st('height:44px;padding:0 2px;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;border-color:transparent;border-bottom-color:#3a3a3a')}>{p.bookLabel}</button>
                    </div>
                    <p style={st('margin:-4px 0 0;font-size:12px;letter-spacing:0.2em;text-transform:uppercase;color:#9a9a9a;line-height:1.7')}>{p.role} · {p.offLabel}</p>
                    <p style={st('margin:0;color:#9a9a9a;font-size:15px;line-height:1.6')}>{p.bio}</p>
                  </article>
                ))}
              </div>
            </section>

            {/* Galleri */}
            <section id="galleri" className="wrap sec">
              <div style={st('display:flex;justify-content:space-between;align-items:flex-end;gap:24px;flex-wrap:wrap;margin-bottom:44px')}>
                <div>
                  <p className="eyebrow">04 · {t.galEyebrow}</p>
                  <h2 className="h2">{t.galTitle}</h2>
                </div>
                <a href="#" onClick={v.noop} style={st('font-size:12px;letter-spacing:0.24em;text-transform:uppercase;border-bottom:1px solid #3a3a3a;padding:12px 0 4px')}>{t.insta}</a>
              </div>
              <div className="gal">
                {v.gallery.map(g => (
                  <figure key={g.img} className="tile">
                    <img src={g.img} srcSet={g.srcset} sizes="(max-width: 639px) 50vw, 33vw" alt={g.alt} loading="lazy" style={st('width:100%;height:100%;object-fit:cover;display:block')} />
                    <figcaption style={st('position:absolute;left:0;right:0;bottom:0;padding:40px 14px 12px;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#ededed;background:linear-gradient(to top, rgba(0,0,0,0.78), rgba(0,0,0,0))')}>{g.cap}</figcaption>
                  </figure>
                ))}
              </div>
            </section>

            {/* Anmeldelser */}
            <section id="anmeldelser" className="wrap sec">
              <p className="eyebrow">05 · {t.revEyebrow}</p>
              <h2 className="h2" style={st('margin-bottom:64px')}>{t.revTitle}</h2>
              <div className="quotes">
                {v.reviews.map((r, i) => (
                  <figure key={i} style={st('margin:0;display:flex;flex-direction:column;gap:24px;border-top:1px solid #262626;padding-top:28px')}>
                    <blockquote className="quote">{r.text}</blockquote>
                    <figcaption style={st('font-size:12px;letter-spacing:0.24em;text-transform:uppercase;color:#8a8a8a')}>{r.who}</figcaption>
                  </figure>
                ))}
              </div>
              <p style={st('margin:40px 0 0;font-size:13px;color:#6f6f6f')}>{t.revNote}</p>
            </section>

            {/* Gavekort */}
            <section id="gavekort" className="sec" style={st('border-top:1px solid #1a1a1a')}>
              <div className="wrap gift" style={st('padding-top:110px')}>
                <div>
                  <p className="eyebrow">06 · {t.giftEyebrow}</p>
                  <h2 className="h2" style={st('margin-bottom:28px')}>{t.giftTitle}</h2>
                  <p style={st('margin:0;color:#9a9a9a;font-size:17px;line-height:1.7;max-width:440px')}>{t.giftText}</p>
                </div>
                <div style={st('border:1px solid #1f1f1f;padding:32px')}>
                  {!v.giftDone ? (
                    <div className="fade" style={st('display:flex;flex-direction:column;gap:22px')}>
                      <h3 className="small-caps" style={st('margin:0')}>{t.giftChoose}</h3>
                      <div className="amounts" role="group" aria-label={t.giftChoose}>
                        {v.amounts.map(a => <button key={a.n} onClick={a.pick} style={st(a.style)} aria-pressed={a.sel}>{a.label}</button>)}
                      </div>
                      <button className="solid" onClick={v.orderGift} style={st('height:56px;width:100%;' + btnSm)}>{t.giftOrder}</button>
                      <p style={st('margin:0;font-size:13px;color:#7f7f7f;line-height:1.6')}>{t.giftPay} <a href="#" onClick={v.openTerms} style={st('color:#bdbdbd;border-bottom:1px solid #3a3a3a')}>{t.terms}</a></p>
                    </div>
                  ) : (
                    <div className="fade" style={st('display:flex;flex-direction:column;gap:18px')} aria-live="polite">
                      <svg width="40" height="40" viewBox="0 0 56 56" fill="none" stroke="#ededed" strokeWidth="1.2" aria-hidden="true"><circle cx="28" cy="28" r="27" /><path d="M18 29l7 7 13-15" /></svg>
                      <h3 style={st("margin:0;font-family:'Josefin Sans',sans-serif;font-weight:200;font-size:30px;letter-spacing:0.04em;line-height:1.3")}>{v.giftDoneTitle}</h3>
                      <p style={st('margin:0;color:#9a9a9a;font-size:16px;line-height:1.7')}>{t.giftDoneText}</p>
                      <div><button className="ghost" onClick={v.giftReset} style={st('height:44px;padding:0 20px;font-size:11px;letter-spacing:0.22em;text-transform:uppercase')}>{t.giftAgain}</button></div>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Kontakt */}
            <section id="kontakt" style={st('border-top:1px solid #1a1a1a;scroll-margin-top:80px')}>
              <div className="wrap" style={st('padding-top:110px;padding-bottom:110px')}>
                <p className="eyebrow">07 · {t.contactEyebrow}</p>
                <h2 className="h2" style={st('margin-bottom:60px')}>{t.contactTitle}</h2>
                <div className="contact">
                  <div style={st('display:flex;flex-direction:column;gap:14px')}>
                    <h3 className="small-caps" style={st('margin:0 0 4px')}>{t.address}</h3>
                    <p style={st('margin:0;font-size:20px;line-height:1.6')}>[Adresse]<br />{t.city}</p>
                  </div>
                  <div style={st('display:flex;flex-direction:column;gap:14px')}>
                    <h3 className="small-caps" style={st('margin:0 0 4px')}>{t.hours}</h3>
                    <div style={st('display:grid;grid-template-columns:auto auto;justify-content:start;column-gap:32px;row-gap:8px;font-size:18px')}>
                      <span>{t.weekdays}</span><span style={st('color:#bdbdbd')}>10 – 18</span>
                      <span>{t.saturday}</span><span style={st('color:#bdbdbd')}>9 – 15</span>
                      <span>{t.sunday}</span><span style={st('color:#bdbdbd')}>{t.closed}</span>
                    </div>
                  </div>
                  <div style={st('display:flex;flex-direction:column;gap:14px')}>
                    <h3 className="small-caps" style={st('margin:0 0 4px')}>{t.write}</h3>
                    <p style={st('margin:0;font-size:20px;line-height:1.6')}>[Telefon]<br />[E-mail]</p>
                    <div><button className="solid" onClick={v.openBlank} style={st('margin-top:10px;height:52px;padding:0 28px;' + btnSm)}>{t.bookOnline}</button></div>
                  </div>
                </div>
                <div className="map" style={st('position:relative;margin-top:72px;border:1px solid #1f1f1f;overflow:hidden;background:#080808')}>
                  <svg viewBox="0 0 1200 400" preserveAspectRatio="xMidYMid slice" width="100%" height="100%" role="img" aria-label={t.mapAria}>
                    <path d="M-20 300 C 200 280, 330 220, 470 230 S 760 300, 1220 250" fill="none" stroke="#151515" strokeWidth="46" />
                    <path d="M120 -10 L 260 410 M 420 -10 L 470 410 M 700 -10 L 640 410 M 930 -10 L 860 410 M 1120 -10 L 1060 410" stroke="#1d1d1d" strokeWidth="2" />
                    <path d="M-10 70 L 1210 110 M -10 170 L 1210 160 M -10 380 L 1210 340" stroke="#1d1d1d" strokeWidth="2" />
                    <path d="M-10 120 L 1210 40" stroke="#2a2a2a" strokeWidth="7" />
                    <path d="M560 -10 L 610 410" stroke="#2a2a2a" strokeWidth="7" />
                    <path d="M300 30 L 360 30 L 380 90 L 310 100 Z M 760 190 L 840 180 L 850 230 L 770 240 Z M 980 60 L 1060 70 L 1050 120 L 990 115 Z" fill="#101010" />
                    <circle className="pulse" cx="588" cy="150" r="9" fill="none" stroke="#ededed" strokeWidth="1" />
                    <circle cx="588" cy="150" r="9" fill="#ededed" />
                    <text x="612" y="140" fill="#ededed" fontFamily="Josefin Sans, sans-serif" fontSize="18" letterSpacing="6">ATELIER</text>
                  </svg>
                  <a href="https://www.google.com/maps/search/?api=1&query=K%C3%B8benhavn" target="_blank" rel="noopener noreferrer" style={st('position:absolute;right:16px;bottom:16px;display:inline-flex;align-items:center;gap:10px;height:44px;padding:0 18px;background:#050505;border:1px solid #3a3a3a;font-size:11px;letter-spacing:0.22em;text-transform:uppercase')}>
                    {t.openMap}
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true"><path d="M3 9L9 3M4 3h5v5" /></svg>
                  </a>
                </div>
              </div>
            </section>
          </main>
        )}

        {/* ===================== BOOKING ===================== */}
        {v.isBooking && (
          <main className="bk-top fade" style={st('padding-bottom:100px;min-height:100vh')}>
            <div className="wrap">
              {v.inFlow && (
                <>
                  <div style={st('margin-bottom:48px')}>
                    <div style={st('display:flex;justify-content:space-between;align-items:baseline;gap:16px;flex-wrap:wrap;margin-bottom:20px')}>
                      <p style={st('margin:0;font-size:12px;letter-spacing:0.3em;text-transform:uppercase;color:#8a8a8a')}>{v.stepLabel}</p>
                      <div className="steptabs" style={st('gap:22px;flex-wrap:wrap')}>
                        {v.stepTabs.map(x => <span key={x.label} style={st(x.style)}>{x.label}</span>)}
                      </div>
                    </div>
                    <div style={st('height:1px;background:#222;position:relative')}><div style={st(v.progressStyle)} /></div>
                  </div>

                  <div className="bk">
                    <div className="bk-main">
                      <h1 style={st("margin:0 0 36px;font-family:'Josefin Sans',sans-serif;font-weight:100;font-size:clamp(32px,5vw,60px);letter-spacing:0.1em;text-transform:uppercase;line-height:1.05")}>{v.stepTitle}</h1>

                      {v.step === 1 && (
                        <div className="fade" style={st('display:flex;flex-direction:column;gap:44px')}>
                          <div style={st('display:flex;flex-direction:column;gap:10px')}>
                            {v.svcOpts.map(o => (
                              <button key={o.id} onClick={o.pick} style={st(o.style)} aria-pressed={o.sel}>
                                <span style={st('display:flex;flex-direction:column;gap:6px')}>
                                  <span style={st('font-size:18px;font-weight:400')}>{o.name}</span>
                                  <span style={st('font-size:14px;opacity:0.72')}>{o.dur}</span>
                                </span>
                                <span style={st('font-size:17px;white-space:nowrap')}>{o.price}</span>
                              </button>
                            ))}
                          </div>
                          <div>
                            <h2 className="small-caps" style={st('margin:0 0 8px')}>{t.addonsTitle}</h2>
                            <p style={st('margin:0 0 16px;font-size:14px;color:#8a8a8a')}>{t.addonsSub}</p>
                            <div className="addons">
                              {v.addonOpts.map(a => (
                                <button key={a.id} onClick={a.toggle} style={st(a.style)} aria-pressed={a.sel}>
                                  <span style={st(a.boxStyle)} aria-hidden="true">
                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M2.5 6.2l2.3 2.3 4.7-5" /></svg>
                                  </span>
                                  <span style={st('display:flex;flex-direction:column;gap:4px;min-width:0')}>
                                    <span style={st('font-size:16px;font-weight:400')}>{a.name}</span>
                                    <span style={st('font-size:13px;opacity:0.72')}>{a.meta}</span>
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {v.step === 2 && (
                        <div className="opts fade">
                          {v.styOpts.map(o => (
                            <button key={o.id} onClick={o.pick} style={st(o.style)} aria-pressed={o.sel}>
                              <span style={st('display:flex;align-items:center;gap:18px;min-width:0')}>
                                {o.isAny ? (
                                  <span style={st('width:60px;height:60px;border-radius:50%;border:1px solid currentColor;display:flex;align-items:center;justify-content:center;flex:0 0 auto;opacity:0.8')}>
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
                                  </span>
                                ) : (
                                  <img src={o.imgSmall} alt="" style={st('width:60px;height:60px;border-radius:50%;object-fit:cover;object-position:50% 25%;flex:0 0 auto;display:block')} />
                                )}
                                <span style={st('display:flex;flex-direction:column;gap:6px;min-width:0')}>
                                  <span style={st("font-family:'Josefin Sans',sans-serif;font-size:19px;font-weight:300;letter-spacing:0.2em;text-transform:uppercase")}>{o.name}</span>
                                  <span style={st('font-size:14px;opacity:0.72;line-height:1.4')}>{o.role}</span>
                                </span>
                              </span>
                            </button>
                          ))}
                        </div>
                      )}

                      {v.step === 3 && (
                        <div className="fade" style={st('display:flex;flex-direction:column;gap:40px')}>
                          <div>
                            <h2 className="small-caps" style={st('margin:0 0 16px')}>{t.dayH}</h2>
                            <div className="days" role="group" aria-label={t.dayH}>
                              {v.dayOpts.map(d => (
                                <button key={d.id} onClick={d.pick} disabled={d.off} style={st(d.style)} aria-pressed={d.sel} aria-label={d.aria}>
                                  <span style={st('font-size:11px;letter-spacing:0.2em;text-transform:uppercase;opacity:0.75')}>{d.wd}</span>
                                  <span style={st('font-size:26px;font-weight:300;line-height:1')}>{d.num}</span>
                                  <span style={st('font-size:11px;letter-spacing:0.14em;text-transform:uppercase;opacity:0.75')}>{d.sub}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <h2 className="small-caps" style={st('margin:0 0 16px')}>{t.timesH} {v.dayHeading}</h2>
                            {v.noDay && <p style={st('margin:0;color:#9a9a9a;font-size:16px')}>{t.pickDay}</p>}
                            {v.dayNoSlots && (
                              <div style={st('border:1px solid #1f1f1f;padding:24px;display:flex;flex-direction:column;gap:16px')}>
                                <p style={st('margin:0;color:#bdbdbd;font-size:16px;line-height:1.6')}>{t.noSlots}</p>
                                {!v.wlJoined ? (
                                  <div style={st('display:flex;flex-direction:column;gap:16px')}>
                                    <div className="field">
                                      <label htmlFor="wl-phone">{t.wlLabel}</label>
                                      <input id="wl-phone" type="tel" autoComplete="tel" inputMode="tel" value={v.fPhone} onChange={v.onPhone} />
                                    </div>
                                    <div><button onClick={v.joinWaitlist} disabled={v.wlDisabled} style={st(v.wlBtnStyle)}>{t.wlJoin}</button></div>
                                  </div>
                                ) : (
                                  <p aria-live="polite" style={st('margin:0;font-size:15px;color:#ededed;line-height:1.6')}>{v.wlDoneText}</p>
                                )}
                              </div>
                            )}
                            <div className="times">
                              {v.timeOpts.map(x => (
                                <button key={x.mins} onClick={x.pick} disabled={x.taken} style={st(x.style)} aria-pressed={x.sel} aria-label={x.aria}>{x.label}</button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {v.step === 4 && (
                        <div className="form fade">
                          {v.welcomeBack && <p className="full" style={st('margin:0;font-size:15px;color:#bdbdbd')}>{t.welcomeBack}</p>}
                          <div className="field">
                            <label htmlFor="f-name">{t.fName}</label>
                            <input id="f-name" type="text" autoComplete="name" value={v.fName} onChange={v.onName} />
                          </div>
                          <div className="field">
                            <label htmlFor="f-phone">{t.fPhone}</label>
                            <input id="f-phone" type="tel" autoComplete="tel" inputMode="tel" value={v.fPhone} onChange={v.onPhone} />
                          </div>
                          <div className="field full">
                            <label htmlFor="f-mail">{t.fMail}</label>
                            <input id="f-mail" type="email" autoComplete="email" value={v.fMail} onChange={v.onMail} />
                          </div>
                          <div className="field full">
                            <label htmlFor="f-note">{t.fNote}</label>
                            <textarea id="f-note" value={v.fNote} onChange={v.onNote} />
                          </div>
                          <label className="check full" htmlFor="f-remember">
                            <input id="f-remember" type="checkbox" checked={v.remember} onChange={v.onRemember} />
                            {t.remember}
                          </label>
                          <p className="full" style={st('margin:0;color:#8a8a8a;font-size:14px;line-height:1.6')}>{t.cancelNote} <a href="#" onClick={v.openPrivacy} style={st('color:#bdbdbd;border-bottom:1px solid #3a3a3a')}>{t.privacy}</a></p>
                        </div>
                      )}

                      <div style={st('margin-top:44px;padding-top:24px;border-top:1px solid #1f1f1f')}>
                        <p aria-live="polite" style={st('margin:0 0 16px;min-height:22px;font-size:14px;line-height:1.5;color:#9a9a9a')}>{v.hint}</p>
                        <div style={st('display:flex;justify-content:space-between;align-items:center;gap:12px')}>
                          <button className="ghost" onClick={v.back} style={st('height:52px;padding:0 14px;font-size:12px;letter-spacing:0.22em;text-transform:uppercase;border-color:transparent')}>{v.backLabel}</button>
                          <button onClick={v.next} disabled={v.nextDisabled} style={st(v.nextStyle)}>{v.nextLabel}</button>
                        </div>
                      </div>
                    </div>

                    <aside className="bk-side" aria-label={t.yourBooking} style={st('border:1px solid #1f1f1f;padding:28px')}>
                      <h2 className="small-caps" style={st('margin:0 0 24px;letter-spacing:0.3em')}>{t.yourBooking}</h2>
                      <dl style={st('margin:0;display:flex;flex-direction:column;gap:20px')}>
                        {v.summary.map(r => (
                          <div key={r.k} style={st('display:flex;flex-direction:column;gap:6px')}>
                            <dt style={st('font-size:11px;letter-spacing:0.24em;text-transform:uppercase;color:#7f7f7f')}>{r.k}</dt>
                            <dd style={st(r.style)}>{r.v}</dd>
                          </div>
                        ))}
                      </dl>
                      <div style={st('display:flex;justify-content:space-between;align-items:baseline;margin-top:28px;padding-top:20px;border-top:1px solid #1f1f1f')}>
                        <span style={st('font-size:11px;letter-spacing:0.24em;text-transform:uppercase;color:#7f7f7f')}>{t.price}</span>
                        <span style={st('font-size:22px;font-weight:400')}>{v.sumPrice}</span>
                      </div>
                      <p style={st('margin:16px 0 0;font-size:13px;color:#7f7f7f;line-height:1.6')}>{t.payInSalon}</p>
                    </aside>
                  </div>
                </>
              )}

              {v.done && (
                <div className="fade" style={st('max-width:720px;margin:24px auto 0;text-align:center;display:flex;flex-direction:column;align-items:center;gap:26px')}>
                  <Check />
                  <p style={st('margin:0;font-size:12px;letter-spacing:0.3em;text-transform:uppercase;color:#8a8a8a')}>Booking {v.ref}</p>
                  <h1 style={st("margin:0;font-family:'Josefin Sans',sans-serif;font-weight:100;font-size:clamp(32px,5vw,60px);letter-spacing:0.1em;text-transform:uppercase;line-height:1.1")}>{v.thanks}</h1>
                  <p style={st('margin:0;font-size:18px;color:#bdbdbd;line-height:1.7')}>{v.doneLine}</p>
                  <div style={st('width:100%;border-top:1px solid #1f1f1f;border-bottom:1px solid #1f1f1f;padding:26px 0;display:grid;grid-template-columns:repeat(auto-fit, minmax(150px, 1fr));gap:20px;text-align:left')}>
                    {v.summary.map(r => (
                      <div key={r.k} style={st('display:flex;flex-direction:column;gap:6px')}>
                        <span style={st('font-size:11px;letter-spacing:0.24em;text-transform:uppercase;color:#7f7f7f')}>{r.k}</span>
                        <span style={st('font-size:16px;line-height:1.5')}>{r.v}</span>
                      </div>
                    ))}
                    <div style={st('display:flex;flex-direction:column;gap:6px')}>
                      <span style={st('font-size:11px;letter-spacing:0.24em;text-transform:uppercase;color:#7f7f7f')}>{t.price}</span>
                      <span style={st('font-size:16px;line-height:1.5')}>{v.sumPrice}</span>
                    </div>
                  </div>
                  <div style={st('display:flex;gap:12px;flex-wrap:wrap;justify-content:center')}>
                    <button className="solid" onClick={v.addCal} style={st('height:52px;padding:0 26px;display:inline-flex;align-items:center;gap:12px;font-size:12px;letter-spacing:0.24em;text-transform:uppercase')}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true"><rect x="2" y="3" width="12" height="11" /><path d="M2 6.5h12M5 1.5v3M11 1.5v3" /></svg>
                      {t.addCal}
                    </button>
                    <button className="ghost" onClick={v.again} style={st('height:52px;padding:0 26px;font-size:12px;letter-spacing:0.24em;text-transform:uppercase')}>{t.again}</button>
                    <button className="ghost" onClick={v.goHome} style={st('height:52px;padding:0 26px;font-size:12px;letter-spacing:0.24em;text-transform:uppercase;border-color:transparent')}>{t.toHome}</button>
                  </div>
                  <p aria-live="polite" style={st('margin:0;min-height:20px;font-size:14px;color:#9a9a9a')}>{v.calMsg}</p>
                </div>
              )}
            </div>
          </main>
        )}

        {/* ===================== JURA ===================== */}
        {v.isLegal && (
          <main className="bk-top fade" style={st('padding-bottom:110px;min-height:100vh')}>
            <article className="wrap legal">
              <p className="eyebrow">{t.legalEyebrow}</p>
              <h1 className="h2" style={st('font-size:clamp(34px,5vw,64px);margin-bottom:28px')}>{v.legalTitle}</h1>
              {v.legalEnNote && <p style={st('margin:0 0 12px;color:#ededed')}>This page is available in Danish only.</p>}
              <p style={st('font-size:14px;color:#8a8a8a')}>{t.legalDraft}</p>
              {v.legalSections.map(x => (
                <section key={x.h}>
                  <h2>{x.h}</h2>
                  <p>{x.p}</p>
                </section>
              ))}
              <div style={st('margin-top:56px;display:flex;gap:12px;flex-wrap:wrap')}>
                {v.legalLinks.map(l => <button key={l.k} className="ghost" onClick={l.go} style={st('height:48px;padding:0 22px;font-size:11px;letter-spacing:0.22em;text-transform:uppercase')}>{l.label}</button>)}
              </div>
            </article>
          </main>
        )}

        {/* Fast bookknap på mobil og tablet */}
        <div className="mbar" style={st(v.mbarStyle)}>
          <button className="solid" onClick={v.openBlank} tabIndex={v.mbarTab} style={st('width:100%;height:52px;font-size:12px;letter-spacing:0.28em;text-transform:uppercase')}>{t.book}</button>
        </div>

        <footer style={st('border-top:1px solid #1a1a1a')}>
          <div className="wrap foot" style={st('display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px 32px;padding-top:32px;font-size:13px;color:#8a8a8a')}>
            <span style={st("font-family:'Josefin Sans',sans-serif;font-weight:300;letter-spacing:0.5em;color:#ededed;padding:12px 0")}>ATELIER</span>
            <nav className="flinks" aria-label={t.legalNav}>
              <a href="#" onClick={v.openPrivacy}>{t.privacy}</a>
              <a href="#" onClick={v.openCookies}>Cookies</a>
              <a href="#" onClick={v.openTerms}>{t.terms}</a>
            </nav>
            <span style={st('padding:12px 0')}>© 2026 Atelier · {t.proposal} · {t.photos}: Unsplash</span>
          </div>
        </footer>
      </div>
    );
  }
}
