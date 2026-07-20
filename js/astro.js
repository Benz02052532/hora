/* ============================================================
   HORA — คณิตศาสตร์ดาราศาสตร์ / โหราศาสตร์ไทย
   คำนวณในเบราว์เซอร์ทั้งหมด ไม่ต้องต่อ API ไม่มีค่าใช้จ่าย
   ============================================================ */

const Astro = (() => {

  const D2R = Math.PI / 180, R2D = 180 / Math.PI;
  const norm360 = d => ((d % 360) + 360) % 360;

  /* ---------- เวลา ---------- */

  /** Julian Day จาก Date (UTC) */
  function julianDay(date) {
    return date.getTime() / 86400000 + 2440587.5;
  }

  /** ศตวรรษจูเลียนนับจาก J2000 */
  function centuries(jd) { return (jd - 2451545.0) / 36525; }

  /** Greenwich Mean Sidereal Time (องศา) */
  function gmst(jd) {
    const T = centuries(jd);
    return norm360(
      280.46061837 + 360.98564736629 * (jd - 2451545.0)
      + 0.000387933 * T * T - T * T * T / 38710000
    );
  }

  /** Local Sidereal Time (องศา) */
  function lst(jd, lonDeg) { return norm360(gmst(jd) + lonDeg); }

  /* ---------- แปลงพิกัดท้องฟ้า ---------- */

  /**
   * RA/Dec → มุมเงย (altitude) และมุมทิศ (azimuth)
   * @param {number} raHours  ไรต์แอสเซนชัน (ชั่วโมง)
   * @param {number} decDeg   เดคลิเนชัน (องศา)
   * @param {number} latDeg   ละติจูดผู้สังเกต
   * @param {number} lstDeg   local sidereal time (องศา)
   */
  function equatorialToHorizontal(raHours, decDeg, latDeg, lstDeg) {
    const ha = (lstDeg - raHours * 15) * D2R;      // hour angle
    const dec = decDeg * D2R, lat = latDeg * D2R;
    const sinAlt = Math.sin(dec) * Math.sin(lat)
                 + Math.cos(dec) * Math.cos(lat) * Math.cos(ha);
    const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
    const az = Math.atan2(
      -Math.cos(dec) * Math.cos(lat) * Math.sin(ha),
      Math.sin(dec) - Math.sin(lat) * sinAlt
    );
    return { alt: alt * R2D, az: norm360(az * R2D) };
  }

  /* ---------- ตำแหน่งดวงอาทิตย์ / ดวงจันทร์ ---------- */

  /** ลองจิจูดสุริยวิถีของดวงอาทิตย์ (สายนะ/tropical, องศา) */
  function sunLongitude(jd) {
    const T = centuries(jd);
    const L0 = norm360(280.46646 + 36000.76983 * T + 0.0003032 * T * T);
    const M = norm360(357.52911 + 35999.05029 * T - 0.0001537 * T * T) * D2R;
    const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M)
            + (0.019993 - 0.000101 * T) * Math.sin(2 * M)
            + 0.000289 * Math.sin(3 * M);
    return norm360(L0 + C);
  }

  /** ลองจิจูดสุริยวิถีของดวงจันทร์ (tropical, องศา) — สูตรย่อของ Meeus */
  function moonLongitude(jd) {
    const T = centuries(jd);
    const Lp = 218.3164477 + 481267.88123421 * T;          // mean longitude
    const D  = (297.8501921 + 445267.1114034 * T) * D2R;   // mean elongation
    const M  = (357.5291092 + 35999.0502909 * T) * D2R;    // sun mean anomaly
    const Mp = (134.9633964 + 477198.8675055 * T) * D2R;   // moon mean anomaly
    const F  = (93.2720950 + 483202.0175233 * T) * D2R;    // argument of latitude
    const lon = Lp
      + 6.288774 * Math.sin(Mp)
      + 1.274027 * Math.sin(2 * D - Mp)
      + 0.658314 * Math.sin(2 * D)
      + 0.213618 * Math.sin(2 * Mp)
      - 0.185116 * Math.sin(M)
      - 0.114332 * Math.sin(2 * F)
      + 0.058793 * Math.sin(2 * D - 2 * Mp)
      + 0.057066 * Math.sin(2 * D - M - Mp)
      + 0.053322 * Math.sin(2 * D + Mp)
      + 0.045758 * Math.sin(2 * D - M)
      - 0.040923 * Math.sin(M - Mp)
      - 0.034720 * Math.sin(D)
      - 0.030383 * Math.sin(M + Mp);
    return norm360(lon);
  }

  /** ราหู = จุดโหนดขึ้นเฉลี่ยของดวงจันทร์ (mean ascending node) */
  function rahuLongitude(jd) {
    const T = centuries(jd);
    return norm360(125.0445479 - 1934.1362891 * T
                   + 0.0020754 * T * T + T * T * T / 467441);
  }

  /* ---------- ดาวเคราะห์ (ธาตุเคปเลอร์โดยประมาณ ใช้ได้ช่วง ค.ศ.1800–2050) ---------- */

  const ELEMENTS = {
    mercury:{a:[0.38709927,0.00000037],e:[0.20563593,0.00001906],i:[7.00497902,-0.00594749],
             L:[252.25032350,149472.67411175],w:[77.45779628,0.16047689],O:[48.33076593,-0.12534081]},
    venus:  {a:[0.72333566,0.00000390],e:[0.00677672,-0.00004107],i:[3.39467605,-0.00078890],
             L:[181.97909950,58517.81538729],w:[131.60246718,0.00268329],O:[76.67984255,-0.27769418]},
    earth:  {a:[1.00000261,0.00000562],e:[0.01671123,-0.00004392],i:[-0.00001531,-0.01294668],
             L:[100.46457166,35999.37244981],w:[102.93768193,0.32327364],O:[0.0,0.0]},
    mars:   {a:[1.52371034,0.00001847],e:[0.09339410,0.00007882],i:[1.84969142,-0.00813131],
             L:[-4.55343205,19140.30268499],w:[-23.94362959,0.44441088],O:[49.55953891,-0.29257343]},
    jupiter:{a:[5.20288700,-0.00011607],e:[0.04838624,-0.00013253],i:[1.30439695,-0.00183714],
             L:[34.39644051,3034.74612775],w:[14.72847983,0.21252668],O:[100.47390909,0.20469106]},
    saturn: {a:[9.53667594,-0.00125060],e:[0.05386179,-0.00050991],i:[2.48599187,0.00193609],
             L:[49.95424423,1222.49362201],w:[92.59887831,-0.41897216],O:[113.66242448,-0.28867794]}
  };

  /** พิกัดสุริยวิถีแบบเฮลิโอเซนทริก (x,y,z หน่วย AU) */
  function heliocentric(name, T) {
    const el = ELEMENTS[name];
    const a = el.a[0] + el.a[1] * T;
    const e = el.e[0] + el.e[1] * T;
    const I = (el.i[0] + el.i[1] * T) * D2R;
    const L = norm360(el.L[0] + el.L[1] * T);
    const w = norm360(el.w[0] + el.w[1] * T);
    const O = norm360(el.O[0] + el.O[1] * T);

    const M = norm360(L - w) * D2R;
    const wArg = (w - O) * D2R, Om = O * D2R;

    // แก้สมการเคปเลอร์
    let E = M;
    for (let k = 0; k < 8; k++) {
      E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    }

    // พิกัดในระนาบวงโคจร
    const xv = a * (Math.cos(E) - e);
    const yv = a * Math.sqrt(1 - e * e) * Math.sin(E);

    const cw = Math.cos(wArg), sw = Math.sin(wArg);
    const cO = Math.cos(Om),   sO = Math.sin(Om);
    const cI = Math.cos(I),    sI = Math.sin(I);

    const xh = xv * (cw * cO - sw * sO * cI) - yv * (sw * cO + cw * sO * cI);
    const yh = xv * (cw * sO + sw * cO * cI) - yv * (sw * sO - cw * cO * cI);
    const zh = xv * (sw * sI) + yv * (cw * sI);
    return { x: xh, y: yh, z: zh };
  }

  /** ลองจิจูดสุริยวิถีของดาวเคราะห์เมื่อมองจากโลก (tropical, องศา) */
  function planetLongitude(name, jd) {
    const T = centuries(jd);
    const p = heliocentric(name, T);
    const e = heliocentric('earth', T);
    return norm360(Math.atan2(p.y - e.y, p.x - e.x) * R2D);
  }

  /* ---------- อายนางศะ (แปลงสายนะ → นิรายนะ แบบไทย/ลาหิรี) ---------- */

  function ayanamsa(jd) {
    // ค่าประมาณแบบลาหิรี: 23.853° ที่ J2000 เลื่อนปีละ ~50.29 พิลิปดา
    return 23.853 + (jd - 2451545.0) / 365.25 * 0.013972;
  }

  /* ---------- ราศี ---------- */

  const RASI = ['เมษ','พฤษภ','เมถุน','กรกฎ','สิงห์','กันย์',
                'ตุลย์','พิจิก','ธนู','มังกร','กุมภ์','มีน'];

  /** แปลงลองจิจูดนิรายนะ → {index, name, degInRasi} */
  function toRasi(siderealLon) {
    const l = norm360(siderealLon);
    const i = Math.floor(l / 30);
    return { index: i, name: RASI[i], deg: l - i * 30 };
  }

  /* ---------- ดาวพระเคราะห์ทั้ง 9 ตามโหราศาสตร์ไทย ---------- */

  const PLANETS = [
    { num:1, key:'sun',     name:'อาทิตย์', symbol:'๑', color:'#ff9d4d' },
    { num:2, key:'moon',    name:'จันทร์',  symbol:'๒', color:'#e6ecff' },
    { num:3, key:'mars',    name:'อังคาร',  symbol:'๓', color:'#ff6b5e' },
    { num:4, key:'mercury', name:'พุธ',     symbol:'๔', color:'#7ee0a8' },
    { num:5, key:'jupiter', name:'พฤหัส',   symbol:'๕', color:'#ffd48a' },
    { num:6, key:'venus',   name:'ศุกร์',    symbol:'๖', color:'#9fd6ff' },
    { num:7, key:'saturn',  name:'เสาร์',    symbol:'๗', color:'#c9a6ff' },
    { num:8, key:'rahu',    name:'ราหู',    symbol:'๘', color:'#8f93a8' },
    { num:9, key:'ketu',    name:'เกตุ',    symbol:'๙', color:'#b58fc9' }
  ];

  /** ตำแหน่งดาวพระเคราะห์ทั้ง 9 (นิรายนะ) ณ เวลาที่กำหนด */
  function planetPositions(date = new Date()) {
    const jd = julianDay(date);
    const ay = ayanamsa(jd);
    const tropical = {
      sun:     sunLongitude(jd),
      moon:    moonLongitude(jd),
      mercury: planetLongitude('mercury', jd),
      venus:   planetLongitude('venus', jd),
      mars:    planetLongitude('mars', jd),
      jupiter: planetLongitude('jupiter', jd),
      saturn:  planetLongitude('saturn', jd),
      rahu:    rahuLongitude(jd)
    };
    tropical.ketu = norm360(tropical.rahu + 180);

    return PLANETS.map(p => {
      const sid = norm360(tropical[p.key] - ay);
      return { ...p, longitude: sid, rasi: toRasi(sid) };
    });
  }

  /* ---------- ลัคนา (ราศีขึ้น) ---------- */

  /** ลัคนา จากเวลาและพิกัดเกิด (นิรายนะ) */
  function ascendant(date, latDeg, lonDeg) {
    const jd = julianDay(date);
    const ramc = lst(jd, lonDeg) * D2R;
    const eps = (23.4392911 - 0.0130042 * centuries(jd)) * D2R;
    const lat = latDeg * D2R;
    let asc = Math.atan2(
      Math.cos(ramc),
      -(Math.sin(ramc) * Math.cos(eps) + Math.tan(lat) * Math.sin(eps))
    ) * R2D;
    asc = norm360(asc + 180);
    return toRasi(norm360(asc - ayanamsa(jd)));
  }

  /* ---------- โหราศาสตร์ไทยพื้นฐาน (ไว้ใช้ถ้าเปิด showComputedAstrology) ---------- */

  const WEEKDAYS = [
    { name:'อาทิตย์', lucky:'แดง',     unlucky:'น้ำเงิน' },
    { name:'จันทร์',  lucky:'เหลือง',  unlucky:'แดง' },
    { name:'อังคาร',  lucky:'ชมพู',    unlucky:'เหลือง' },
    { name:'พุธ',     lucky:'เขียว',   unlucky:'ชมพู' },
    { name:'พฤหัสบดี',lucky:'ส้ม',     unlucky:'ม่วง' },
    { name:'ศุกร์',   lucky:'ฟ้า',     unlucky:'ดำ' },
    { name:'เสาร์',   lucky:'ม่วง',    unlucky:'เขียว' }
  ];

  const ZODIAC_ANIMALS = ['ชวด','ฉลู','ขาล','เถาะ','มะโรง','มะเส็ง',
                          'มะเมีย','มะแม','วอก','ระกา','จอ','กุน'];

  const ELEMENTS_TH = ['ไฟ','ดิน','ลม','น้ำ'];

  /** สรุปข้อมูลโหราศาสตร์จากวันเกิด */
  function birthProfile(birthDate) {
    const d = new Date(birthDate);
    if (isNaN(d)) return null;
    const weekday = WEEKDAYS[d.getDay()];
    const animal = ZODIAC_ANIMALS[(d.getFullYear() - 4) % 12];
    const jd = julianDay(d);
    const sunSid = norm360(sunLongitude(jd) - ayanamsa(jd));
    const rasi = toRasi(sunSid);
    return {
      weekday: weekday.name,
      luckyColor: weekday.lucky,
      unluckyColor: weekday.unlucky,
      animal,
      element: ELEMENTS_TH[rasi.index % 4],
      rasi: rasi.name,
      age: Math.floor((Date.now() - d.getTime()) / 31557600000)
    };
  }

  return {
    julianDay, centuries, gmst, lst, equatorialToHorizontal,
    sunLongitude, moonLongitude, rahuLongitude, planetLongitude,
    ayanamsa, toRasi, planetPositions, ascendant, birthProfile,
    RASI, PLANETS, WEEKDAYS, ZODIAC_ANIMALS, norm360
  };
})();

window.Astro = Astro;
