/* ============================================================
   HORA — ฉากท้องฟ้าจริง (canvas)
   ดาวจริงเหนือประเทศไทย ณ เวลาปัจจุบัน + ทางช้างเผือก + ดาวตก
   ============================================================ */

const Sky = (() => {

  const D2R = Math.PI / 180;
  let cv, ctx, W = 0, H = 0, DPR = 1;
  let cfg, lat, lon, speed;
  let bgStars = [], milkyWay = [], nebulae = [], shooting = [];
  let glowSprite, softSprite;
  let mouseX = 0, mouseY = 0, parX = 0, parY = 0;
  let startWall = Date.now(), startSim = Date.now();
  let running = false, rafId = null;
  let onPlanets = null, lastPlanetTick = 0;

  /* ---------- สไปรต์ (วาดครั้งเดียว ใช้ซ้ำ = เร็ว) ---------- */

  function makeSprite(size, stops) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
    stops.forEach(([o, col]) => grd.addColorStop(o, col));
    g.fillStyle = grd;
    g.fillRect(0, 0, size, size);
    return c;
  }

  /* ---------- แปลงพิกัดกาแล็กซี → เส้นศูนย์สูตรฟ้า ---------- */

  function galacticToEquatorial(l, b) {
    const aG = 192.859508 * D2R, dG = 27.128336 * D2R, lNCP = 122.932 * D2R;
    l *= D2R; b *= D2R;
    const sinDec = Math.sin(dG) * Math.sin(b)
                 + Math.cos(dG) * Math.cos(b) * Math.cos(lNCP - l);
    const dec = Math.asin(Math.max(-1, Math.min(1, sinDec)));
    const ra = aG + Math.atan2(
      Math.cos(b) * Math.sin(lNCP - l),
      Math.cos(dG) * Math.sin(b) - Math.sin(dG) * Math.cos(b) * Math.cos(lNCP - l)
    );
    return { ra: ((ra / D2R / 15) % 24 + 24) % 24, dec: dec / D2R };
  }

  /* ---------- เตรียมข้อมูลฉาก ---------- */

  function buildScene() {
    // ดาวพื้นหลังสุ่ม (เติมให้ท้องฟ้าแน่น)
    bgStars = [];
    for (let i = 0; i < cfg.starCount; i++) {
      bgStars.push({
        ra: Math.random() * 24,
        dec: Math.asin(Math.random() * 2 - 1) / D2R,   // กระจายสม่ำเสมอบนทรงกลม
        mag: 3.2 + Math.random() * 3.3,
        phase: Math.random() * Math.PI * 2,
        rate: 0.6 + Math.random() * 2.2,
        hue: Math.random() < 0.12 ? (Math.random() < 0.5 ? 30 : 210) : 0
      });
    }

    // ทางช้างเผือก — จุดฟุ้งตามแนวเส้นศูนย์สูตรกาแล็กซี
    milkyWay = [];
    if (cfg.showMilkyWay) {
      for (let l = 0; l < 360; l += 1.4) {
        // ใจกลางกาแล็กซี (l ใกล้ 0) หนาและสว่างกว่า
        const toCenter = Math.min(Math.abs(l), 360 - Math.abs(l));
        const density = 1 - Math.min(toCenter, 90) / 130;
        const spread = 5 + 12 * density;
        const n = 3 + Math.round(5 * density);
        for (let k = 0; k < n; k++) {
          const b = (Math.random() + Math.random() + Math.random() - 1.5) * spread;
          const p = galacticToEquatorial(l, b);
          milkyWay.push({
            ra: p.ra, dec: p.dec,
            size: 30 + Math.random() * 82 * (0.5 + density),
            alpha: (0.030 + Math.random() * 0.062) * (0.45 + density)
          });
        }
      }
    }

    // เนบิวลาเด่นๆ — จุดสีอ่อนเพิ่มมิติ
    nebulae = [
      { ra:5.588,  dec:-5.39,  size:150, color:'rgba(255,150,190,0.10)' }, // เนบิวลานายพราน
      { ra:10.752, dec:-59.87, size:170, color:'rgba(255,170,120,0.09)' }, // กระดูกงูเรือ
      { ra:20.833, dec:31.0,   size:190, color:'rgba(140,180,255,0.07)' }, // เวลหงส์
      { ra:0.712,  dec:41.27,  size:110, color:'rgba(200,190,255,0.09)' }, // แอนดรอเมดา
      { ra:13.42,  dec:-43.0,  size:130, color:'rgba(160,140,255,0.06)' }
    ];

    shooting = [];
  }

  /* ---------- ปรับขนาด canvas ---------- */

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = Math.round(W * DPR);
    cv.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  /* ---------- โปรเจกชันแบบสเตริโอกราฟิก (จุดกลางจอ = จุดเหนือศีรษะ) ---------- */

  function project(alt, az, R) {
    // alt 90° → กลางจอ, alt 0° → ขอบวงกลมรัศมี R
    const r = Math.tan((90 - alt) / 2 * D2R) * R;
    const a = az * D2R;
    return { x: W / 2 + r * Math.sin(a), y: H / 2 - r * Math.cos(a), r };
  }

  /* ---------- ดาวตก ---------- */

  function spawnShooting() {
    const edge = Math.random() * Math.PI * 2;
    const R = Math.hypot(W, H) / 2;
    shooting.push({
      x: W / 2 + Math.cos(edge) * R,
      y: H / 2 + Math.sin(edge) * R,
      vx: -Math.cos(edge) * (7 + Math.random() * 7) + (Math.random() - 0.5) * 6,
      vy: -Math.sin(edge) * (7 + Math.random() * 7) + (Math.random() - 0.5) * 6,
      life: 1, len: 60 + Math.random() * 130
    });
  }

  /* ---------- วาดหนึ่งเฟรม ---------- */

  function draw() {
    if (!running) return;

    // เวลาจำลอง (เร่งให้เห็นดาวเคลื่อน)
    const simTime = startSim + (Date.now() - startWall) * speed;
    const now = new Date(simTime);
    const jd = Astro.julianDay(now);
    const lstDeg = Astro.lst(jd, lon);
    const t = Date.now() / 1000;

    // พารัลแลกซ์ตามเมาส์ (ค่อยๆ ตาม ไม่กระตุก)
    parX += (mouseX - parX) * 0.045;
    parY += (mouseY - parY) * 0.045;
    const px = cfg.parallax ? parX * 26 : 0;
    const py = cfg.parallax ? parY * 26 : 0;

    const R = Math.hypot(W, H) * 0.60;

    // --- พื้นหลังอวกาศ ---
    const bg = ctx.createRadialGradient(W/2 + px*0.4, H*0.42 + py*0.4, 0,
                                        W/2, H/2, Math.hypot(W, H) * 0.78);
    bg.addColorStop(0,    '#131a3a');
    bg.addColorStop(0.42, '#0c1029');
    bg.addColorStop(1,    '#04050f');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.translate(px, py);
    ctx.globalCompositeOperation = 'lighter';

    // --- ทางช้างเผือก ---
    for (const m of milkyWay) {
      const h = Astro.equatorialToHorizontal(m.ra, m.dec, lat, lstDeg);
      if (h.alt < -6) continue;
      const p = project(h.alt, h.az, R);
      if (p.x < -200 || p.x > W + 200 || p.y < -200 || p.y > H + 200) continue;
      const fade = h.alt < 4 ? (h.alt + 6) / 10 : 1;
      ctx.globalAlpha = m.alpha * fade;
      ctx.drawImage(softSprite, p.x - m.size/2, p.y - m.size/2, m.size, m.size);
    }

    // --- เนบิวลา ---
    for (const n of nebulae) {
      const h = Astro.equatorialToHorizontal(n.ra, n.dec, lat, lstDeg);
      if (h.alt < 0) continue;
      const p = project(h.alt, h.az, R);
      const spr = makeNebulaSprite(n.color);
      ctx.globalAlpha = 1;
      ctx.drawImage(spr, p.x - n.size/2, p.y - n.size/2, n.size, n.size);
    }

    // --- ดาวพื้นหลัง ---
    for (const s of bgStars) {
      const h = Astro.equatorialToHorizontal(s.ra, s.dec, lat, lstDeg);
      if (h.alt < 0) continue;
      const p = project(h.alt, h.az, R);
      if (p.x < -8 || p.x > W + 8 || p.y < -8 || p.y > H + 8) continue;

      const tw = 0.72 + 0.28 * Math.sin(t * s.rate + s.phase);
      const horizonFade = Math.min(1, h.alt / 12);
      let a = (1.35 - s.mag / 6.5) * tw * horizonFade;
      if (a <= 0.02) continue;
      const size = Math.max(0.7, (6.6 - s.mag) * 0.32);

      ctx.globalAlpha = Math.min(1, a);
      ctx.fillStyle = s.hue === 0 ? '#ffffff'
                    : s.hue === 30 ? '#ffd7ad' : '#c7dbff';
      ctx.fillRect(p.x - size/2, p.y - size/2, size, size);
    }

    // --- เส้นกลุ่มดาว ---
    if (cfg.showConstellations) {
      const pos = {};
      for (const key in STAR_CATALOG) {
        const [ra, dec] = STAR_CATALOG[key];
        const h = Astro.equatorialToHorizontal(ra, dec, lat, lstDeg);
        pos[key] = h.alt > 0 ? project(h.alt, h.az, R) : null;
      }
      ctx.globalAlpha = 1;
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(160,198,255,0.28)';
      ctx.beginPath();
      for (const c of CONSTELLATIONS) {
        for (const [a, b] of c.lines) {
          const pa = pos[a], pb = pos[b];
          if (!pa || !pb) continue;
          if (Math.hypot(pa.x - pb.x, pa.y - pb.y) > Math.max(W, H) * 0.55) continue;
          ctx.moveTo(pa.x, pa.y);
          ctx.lineTo(pb.x, pb.y);
        }
      }
      ctx.stroke();
    }

    // --- ดาวสว่างจริง (มีชื่อ) ---
    for (const key in STAR_CATALOG) {
      const [ra, dec, mag] = STAR_CATALOG[key];
      const h = Astro.equatorialToHorizontal(ra, dec, lat, lstDeg);
      if (h.alt < 0) continue;
      const p = project(h.alt, h.az, R);
      const tw = 0.82 + 0.18 * Math.sin(t * 1.7 + ra);
      const bright = Math.max(0.15, (2.6 - mag) / 4 + 0.45) * tw
                   * Math.min(1, h.alt / 10);
      const g = (5.2 - mag) * 5.2;

      ctx.globalAlpha = Math.min(0.95, bright * 0.62);
      ctx.drawImage(glowSprite, p.x - g/2, p.y - g/2, g, g);

      ctx.globalAlpha = Math.min(1, bright);
      ctx.fillStyle = '#ffffff';
      const core = Math.max(1.1, (3.2 - mag) * 0.75);
      ctx.beginPath();
      ctx.arc(p.x, p.y, core, 0, Math.PI * 2);
      ctx.fill();
    }

    // --- ดาวเคราะห์ทั้ง 9 (ตำแหน่งจริง) ---
    const planets = Astro.planetPositions(now);
    const eps = 23.4393 * D2R;
    for (const pl of planets) {
      if (pl.key === 'rahu' || pl.key === 'ketu') continue;  // จุดสมมติ ไม่มีตัวตนบนฟ้า
      // นิรายนะ → สายนะ → RA/Dec (ประมาณว่าอยู่บนสุริยวิถี)
      const lam = (pl.longitude + Astro.ayanamsa(jd)) * D2R;
      const ra = Math.atan2(Math.cos(eps) * Math.sin(lam), Math.cos(lam)) / D2R / 15;
      const dec = Math.asin(Math.sin(eps) * Math.sin(lam)) / D2R;
      const h = Astro.equatorialToHorizontal((ra + 24) % 24, dec, lat, lstDeg);
      if (h.alt < 0) continue;
      const p = project(h.alt, h.az, R);
      const big = pl.key === 'sun' ? 190 : pl.key === 'moon' ? 130 : 34;

      ctx.globalAlpha = pl.key === 'sun' ? 0.30 : pl.key === 'moon' ? 0.34 : 0.62;
      ctx.drawImage(makeNebulaSprite(hexToRgba(pl.color, 0.6)),
                    p.x - big/2, p.y - big/2, big, big);

      ctx.globalAlpha = 1;
      ctx.fillStyle = pl.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, pl.key === 'sun' ? 7 : pl.key === 'moon' ? 6 : 2.6, 0, Math.PI*2);
      ctx.fill();
    }

    // --- ดาวตก ---
    if (cfg.shootingStars) {
      if (Math.random() < 0.0055 && shooting.length < 3) spawnShooting();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = shooting.length - 1; i >= 0; i--) {
        const s = shooting[i];
        s.x += s.vx; s.y += s.vy; s.life -= 0.011;
        if (s.life <= 0) { shooting.splice(i, 1); continue; }
        const n = Math.hypot(s.vx, s.vy) || 1;
        const tx = s.x - s.vx / n * s.len, ty = s.y - s.vy / n * s.len;
        const grd = ctx.createLinearGradient(s.x, s.y, tx, ty);
        grd.addColorStop(0, `rgba(255,255,255,${s.life})`);
        grd.addColorStop(0.35, `rgba(190,215,255,${s.life * 0.45})`);
        grd.addColorStop(1, 'rgba(190,215,255,0)');
        ctx.globalAlpha = 1;
        ctx.strokeStyle = grd;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(tx, ty);
        ctx.stroke();
      }
    }

    ctx.restore();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;

    // --- แสงเรืองขอบฟ้าและขอบจอ (vignette) ---
    const vg = ctx.createRadialGradient(W/2, H/2, Math.min(W,H)*0.30,
                                        W/2, H/2, Math.hypot(W,H)*0.62);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(2,3,10,0.72)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);

    // --- ส่งตำแหน่งดาวเคราะห์ให้ UI (วินาทีละครั้งพอ) ---
    if (onPlanets && Date.now() - lastPlanetTick > 1000) {
      lastPlanetTick = Date.now();
      onPlanets(planets, now);
    }

    rafId = requestAnimationFrame(draw);
  }

  /* ---------- ตัวช่วยสี ---------- */

  function hexToRgba(hex, a) {
    const h = hex.replace('#', '');
    const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }

  const nebulaCache = new Map();
  function makeNebulaSprite(color) {
    if (nebulaCache.has(color)) return nebulaCache.get(color);
    const spr = makeSprite(128, [
      [0, color],
      [0.35, color.replace(/[\d.]+\)$/, '0.05)')],
      [1, 'rgba(0,0,0,0)']
    ]);
    nebulaCache.set(color, spr);
    return spr;
  }

  /* ---------- เริ่มต้น ---------- */

  function init(canvas, config, planetCallback) {
    cv = canvas;
    ctx = cv.getContext('2d', { alpha: false });
    cfg = config.visual;
    lat = config.latitude;
    lon = config.longitude;
    speed = Math.max(1, cfg.skySpeed || 1);
    onPlanets = planetCallback;

    glowSprite = makeSprite(64, [
      [0, 'rgba(255,255,255,0.95)'],
      [0.25, 'rgba(200,225,255,0.35)'],
      [1, 'rgba(160,200,255,0)']
    ]);
    softSprite = makeSprite(128, [
      [0, 'rgba(190,205,255,0.85)'],
      [0.45, 'rgba(150,170,255,0.20)'],
      [1, 'rgba(120,150,255,0)']
    ]);

    resize();
    buildScene();

    window.addEventListener('resize', resize);
    if (cfg.parallax) {
      window.addEventListener('pointermove', e => {
        mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
        mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
      });
    }
    // หยุดวาดเมื่อสลับแท็บ (ประหยัดแบตเตอรี่)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop(); else start();
    });

    start();
  }

  function start() {
    if (running) return;
    running = true;
    startWall = Date.now();
    startSim = Date.now();
    rafId = requestAnimationFrame(draw);
  }

  function stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
  }

  return { init, start, stop };
})();

window.Sky = Sky;
