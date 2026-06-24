/**
 * Satellite Metadata Service
 * Provides country, operator, and agency information for satellites.
 * Based on NORAD catalog naming conventions and known satellite programs.
 */

export interface SatelliteMetadata {
  country: string;
  operator: string;
  agency?: string;
  purpose?: string;
}

// ─── Known Satellites by NORAD ID ────────────────────────────────────────────

const KNOWN_SATELLITES: Record<number, SatelliteMetadata> = {
  25544: { country: "International", operator: "NASA/Roscosmos/ESA/JAXA/CSA", agency: "ISS Partners", purpose: "Space Station" },
  48274: { country: "China", operator: "CNSA", agency: "China National Space Administration", purpose: "Space Station" },
  20580: { country: "United States", operator: "NASA", agency: "NASA/STScI", purpose: "Astronomy" },
  27424: { country: "United States", operator: "NASA", agency: "NASA GSFC", purpose: "Earth Observation" },
  27386: { country: "United States", operator: "NASA", agency: "NASA GSFC", purpose: "Earth Observation" },
  25994: { country: "United States", operator: "NASA", agency: "NASA", purpose: "Earth Observation" },
  36508: { country: "United States", operator: "NASA", agency: "NASA/JPL", purpose: "Earth Observation" },
  38771: { country: "United States", operator: "NASA", agency: "NASA", purpose: "Earth Observation" },
  43013: { country: "United States", operator: "NASA/NOAA", agency: "NASA", purpose: "Weather" },
  29155: { country: "United States", operator: "NASA/CNES", agency: "NASA/JPL", purpose: "Oceanography" },
  39084: { country: "United States", operator: "NASA/USGS", agency: "NASA", purpose: "Earth Observation" },
  49260: { country: "United States", operator: "NASA/USGS", agency: "NASA", purpose: "Earth Observation" },
};

// ─── Country Detection by Name Patterns ──────────────────────────────────────

const COUNTRY_PATTERNS: Array<{ pattern: RegExp; meta: SatelliteMetadata }> = [
  // ═══════════════════════════════════════════════════════════════════════════
  // UNITED STATES
  // ═══════════════════════════════════════════════════════════════════════════
  { pattern: /^GPS|^NAVSTAR/i, meta: { country: "United States", operator: "US Space Force", agency: "US DoD" } },
  { pattern: /^STARLINK/i, meta: { country: "United States", operator: "SpaceX", agency: "SpaceX" } },
  { pattern: /^GOES/i, meta: { country: "United States", operator: "NOAA", agency: "NOAA/NASA" } },
  { pattern: /^NOAA/i, meta: { country: "United States", operator: "NOAA", agency: "NOAA" } },
  { pattern: /^LANDSAT/i, meta: { country: "United States", operator: "USGS/NASA", agency: "NASA" } },
  { pattern: /^WORLDVIEW/i, meta: { country: "United States", operator: "Maxar Technologies", agency: "Maxar" } },
  { pattern: /^IRIDIUM/i, meta: { country: "United States", operator: "Iridium Communications", agency: "Iridium" } },
  { pattern: /^GLOBALSTAR/i, meta: { country: "United States", operator: "Globalstar Inc.", agency: "Globalstar" } },
  { pattern: /^ORBCOMM/i, meta: { country: "United States", operator: "ORBCOMM Inc.", agency: "ORBCOMM" } },
  { pattern: /^DRAGON/i, meta: { country: "United States", operator: "SpaceX", agency: "SpaceX/NASA" } },
  { pattern: /^CREW DRAGON/i, meta: { country: "United States", operator: "SpaceX", agency: "SpaceX/NASA" } },
  { pattern: /^HST|^HUBBLE/i, meta: { country: "United States", operator: "NASA/ESA", agency: "NASA/STScI" } },
  { pattern: /^TERRA$|^AQUA$/i, meta: { country: "United States", operator: "NASA", agency: "NASA EOS" } },
  { pattern: /^TDRS/i, meta: { country: "United States", operator: "NASA", agency: "NASA GSFC" } },
  { pattern: /^TIROS/i, meta: { country: "United States", operator: "NOAA", agency: "NOAA" } },
  { pattern: /^DMSP/i, meta: { country: "United States", operator: "US DoD", agency: "USAF" } },
  { pattern: /^NOSS/i, meta: { country: "United States", operator: "US Navy", agency: "NRO" } },
  { pattern: /^USA[ -]/i, meta: { country: "United States", operator: "US DoD", agency: "US Military" } },
  { pattern: /^CYGNUS/i, meta: { country: "United States", operator: "Northrop Grumman", agency: "NASA" } },
  { pattern: /^GEOEYE/i, meta: { country: "United States", operator: "Maxar Technologies", agency: "Maxar" } },
  { pattern: /^DIGITALGLOBE/i, meta: { country: "United States", operator: "Maxar Technologies", agency: "Maxar" } },
  { pattern: /^VIASAT/i, meta: { country: "United States", operator: "Viasat Inc.", agency: "Viasat" } },
  { pattern: /^ECHOSTAR/i, meta: { country: "United States", operator: "EchoStar", agency: "EchoStar" } },
  { pattern: /^DIRECTV|^DTV/i, meta: { country: "United States", operator: "DirecTV", agency: "AT&T" } },
  { pattern: /^DISH/i, meta: { country: "United States", operator: "Dish Network", agency: "Dish" } },
  { pattern: /^XM[ -]/i, meta: { country: "United States", operator: "SiriusXM", agency: "SiriusXM" } },
  { pattern: /^SIRIUS/i, meta: { country: "United States", operator: "SiriusXM", agency: "SiriusXM" } },
  { pattern: /^SXM/i, meta: { country: "United States", operator: "SiriusXM", agency: "SiriusXM" } },
  { pattern: /^WGS/i, meta: { country: "United States", operator: "US DoD", agency: "USAF" } },
  { pattern: /^AEHF/i, meta: { country: "United States", operator: "US Space Force", agency: "USSF" } },
  { pattern: /^MUOS/i, meta: { country: "United States", operator: "US Navy", agency: "US Navy" } },
  { pattern: /^SBIRS/i, meta: { country: "United States", operator: "US Space Force", agency: "USSF" } },
  { pattern: /^DSP/i, meta: { country: "United States", operator: "US Space Force", agency: "USSF" } },
  { pattern: /^GPSII|^GPS II/i, meta: { country: "United States", operator: "US Space Force", agency: "US DoD" } },
  { pattern: /^MILSTAR/i, meta: { country: "United States", operator: "US Space Force", agency: "USSF" } },
  { pattern: /^SPACEX/i, meta: { country: "United States", operator: "SpaceX", agency: "SpaceX" } },
  { pattern: /^TRANSPORTER/i, meta: { country: "United States", operator: "SpaceX", agency: "SpaceX (Rideshare)" } },
  { pattern: /^FALCON/i, meta: { country: "United States", operator: "SpaceX", agency: "SpaceX" } },
  { pattern: /^PLANET LABS|^DOVE|^FLOCK|^SKYSAT/i, meta: { country: "United States", operator: "Planet Labs", agency: "Planet" } },
  { pattern: /^SPIRE/i, meta: { country: "United States", operator: "Spire Global", agency: "Spire" } },
  { pattern: /^SWARM/i, meta: { country: "United States", operator: "Swarm/SpaceX", agency: "SpaceX" } },
  { pattern: /^HAWK[ -]/i, meta: { country: "United States", operator: "HawkEye 360", agency: "HawkEye 360" } },
  { pattern: /^BLACKJACK/i, meta: { country: "United States", operator: "DARPA", agency: "US DoD" } },
  { pattern: /^CUBESAT|^LEMUR/i, meta: { country: "United States", operator: "Spire Global", agency: "Spire" } },
  { pattern: /^O3B/i, meta: { country: "United States", operator: "SES/O3b", agency: "SES" } },
  { pattern: /^AURA$|^SUOMI/i, meta: { country: "United States", operator: "NASA", agency: "NASA" } },
  { pattern: /^SWIFT|^FERMI|^CHANDRA|^NUSTAR/i, meta: { country: "United States", operator: "NASA", agency: "NASA" } },
  { pattern: /^TESS$|^JWST/i, meta: { country: "United States", operator: "NASA", agency: "NASA" } },
  { pattern: /^CALIPSO/i, meta: { country: "United States", operator: "NASA/CNES", agency: "NASA" } },
  { pattern: /^CLOUDSAT/i, meta: { country: "United States", operator: "NASA/CSA", agency: "NASA/JPL" } },
  { pattern: /^GPM/i, meta: { country: "United States", operator: "NASA/JAXA", agency: "NASA" } },
  { pattern: /^ICESat/i, meta: { country: "United States", operator: "NASA", agency: "NASA" } },
  { pattern: /^OCO/i, meta: { country: "United States", operator: "NASA", agency: "NASA/JPL" } },
  { pattern: /^GRACE/i, meta: { country: "United States", operator: "NASA/DLR", agency: "NASA/JPL" } },

  // ═══════════════════════════════════════════════════════════════════════════
  // INTERNATIONAL / MULTI-NATIONAL
  // ═══════════════════════════════════════════════════════════════════════════
  { pattern: /^INTELSAT/i, meta: { country: "International", operator: "Intelsat S.A.", agency: "Intelsat" } },
  { pattern: /^INMARSAT/i, meta: { country: "International", operator: "Inmarsat", agency: "Inmarsat" } },
  { pattern: /^THURAYA/i, meta: { country: "UAE", operator: "Thuraya", agency: "Thuraya" } },
  { pattern: /^EUTELSAT/i, meta: { country: "France", operator: "Eutelsat", agency: "Eutelsat" } },
  { pattern: /^SES[ -]/i, meta: { country: "Luxembourg", operator: "SES S.A.", agency: "SES" } },
  { pattern: /^ASTRA/i, meta: { country: "Luxembourg", operator: "SES S.A.", agency: "SES" } },

  // ═══════════════════════════════════════════════════════════════════════════
  // EUROPE (ESA / EU Member States)
  // ═══════════════════════════════════════════════════════════════════════════
  { pattern: /^GALILEO/i, meta: { country: "European Union", operator: "ESA/EU", agency: "European Space Agency" } },
  { pattern: /^SENTINEL/i, meta: { country: "European Union", operator: "ESA", agency: "ESA/Copernicus" } },
  { pattern: /^METEOSAT/i, meta: { country: "Europe", operator: "EUMETSAT", agency: "EUMETSAT" } },
  { pattern: /^MSG/i, meta: { country: "Europe", operator: "EUMETSAT", agency: "EUMETSAT" } },
  { pattern: /^MTG/i, meta: { country: "Europe", operator: "EUMETSAT", agency: "EUMETSAT" } },
  { pattern: /^METOP/i, meta: { country: "Europe", operator: "EUMETSAT", agency: "EUMETSAT/ESA" } },
  { pattern: /^ENVISAT/i, meta: { country: "Europe", operator: "ESA", agency: "ESA" } },
  { pattern: /^AEOLUS/i, meta: { country: "Europe", operator: "ESA", agency: "ESA" } },
  { pattern: /^CRYOSAT/i, meta: { country: "Europe", operator: "ESA", agency: "ESA" } },
  { pattern: /^SWARM/i, meta: { country: "Europe", operator: "ESA", agency: "ESA" } },
  { pattern: /^PROBA/i, meta: { country: "Europe", operator: "ESA", agency: "ESA" } },
  { pattern: /^SPOT/i, meta: { country: "France", operator: "CNES", agency: "CNES" } },
  { pattern: /^PLEIADES/i, meta: { country: "France", operator: "CNES/Airbus", agency: "CNES" } },
  { pattern: /^HELIOS/i, meta: { country: "France", operator: "DGA", agency: "French MoD" } },
  { pattern: /^CSO[ -]/i, meta: { country: "France", operator: "DGA/CNES", agency: "French MoD" } },
  { pattern: /^TELECOM/i, meta: { country: "France", operator: "France Telecom", agency: "France" } },
  { pattern: /^SYRACUSE/i, meta: { country: "France", operator: "DGA", agency: "French MoD" } },
  { pattern: /^SAR-LUPE/i, meta: { country: "Germany", operator: "Bundeswehr", agency: "German MoD" } },
  { pattern: /^TERRASAR/i, meta: { country: "Germany", operator: "DLR/Airbus", agency: "DLR" } },
  { pattern: /^TANDEM/i, meta: { country: "Germany", operator: "DLR", agency: "DLR" } },
  { pattern: /^COSMO-SKYMED|^CSK/i, meta: { country: "Italy", operator: "ASI", agency: "Italian Space Agency" } },
  { pattern: /^SICRAL/i, meta: { country: "Italy", operator: "Italian MoD", agency: "Telespazio" } },
  { pattern: /^PAZ$|^SEOSAT/i, meta: { country: "Spain", operator: "INTA", agency: "Spanish MoD" } },

  // ═══════════════════════════════════════════════════════════════════════════
  // RUSSIA
  // ═══════════════════════════════════════════════════════════════════════════
  { pattern: /^GLONASS/i, meta: { country: "Russia", operator: "Roscosmos", agency: "Russian Space Forces" } },
  { pattern: /^COSMOS|^KOSMOS/i, meta: { country: "Russia", operator: "Roscosmos", agency: "Russian MoD" } },
  { pattern: /^METEOR[-\s]?M/i, meta: { country: "Russia", operator: "Roscosmos", agency: "Roshydromet" } },
  { pattern: /^MOLNIYA/i, meta: { country: "Russia", operator: "Roscosmos", agency: "Russian MoD" } },
  { pattern: /^GONETS/i, meta: { country: "Russia", operator: "Roscosmos", agency: "Gonets" } },
  { pattern: /^LUCH/i, meta: { country: "Russia", operator: "Roscosmos", agency: "Roscosmos" } },
  { pattern: /^RESURS/i, meta: { country: "Russia", operator: "Roscosmos", agency: "Roscosmos" } },
  { pattern: /^ELEKTRO/i, meta: { country: "Russia", operator: "Roscosmos", agency: "Roshydromet" } },
  { pattern: /^EXPRESS/i, meta: { country: "Russia", operator: "RSCC", agency: "Russian Satellite Communications" } },
  { pattern: /^YAMAL/i, meta: { country: "Russia", operator: "Gazprom Space Systems", agency: "Gazprom" } },
  { pattern: /^PROGRESS/i, meta: { country: "Russia", operator: "Roscosmos", agency: "RSC Energia" } },
  { pattern: /^SOYUZ/i, meta: { country: "Russia", operator: "Roscosmos", agency: "RSC Energia" } },
  { pattern: /^KANOPUS/i, meta: { country: "Russia", operator: "Roscosmos", agency: "Roscosmos" } },
  { pattern: /^KONDOR/i, meta: { country: "Russia", operator: "Roscosmos", agency: "NPO Mashinostroyeniya" } },
  { pattern: /^ARKTIKA/i, meta: { country: "Russia", operator: "Roscosmos", agency: "Roshydromet" } },
  { pattern: /^RODNIK/i, meta: { country: "Russia", operator: "Russian MoD", agency: "Russian Navy" } },
  { pattern: /^STRELA/i, meta: { country: "Russia", operator: "Russian MoD", agency: "Russian MoD" } },

  // ═══════════════════════════════════════════════════════════════════════════
  // CHINA
  // ═══════════════════════════════════════════════════════════════════════════
  { pattern: /^BEIDOU/i, meta: { country: "China", operator: "CNSA", agency: "BeiDou Navigation System" } },
  { pattern: /^TIANGONG/i, meta: { country: "China", operator: "CNSA", agency: "China Manned Space" } },
  { pattern: /^CSS\s/i, meta: { country: "China", operator: "CNSA", agency: "China Manned Space" } },
  { pattern: /^FENGYUN|^FY[ -]/i, meta: { country: "China", operator: "CMA", agency: "China Meteorological Administration" } },
  { pattern: /^YAOGAN/i, meta: { country: "China", operator: "CNSA", agency: "CNSA" } },
  { pattern: /^GAOFEN/i, meta: { country: "China", operator: "CNSA", agency: "CNSA" } },
  { pattern: /^ZIYUAN|^ZY[ -]/i, meta: { country: "China", operator: "CNSA", agency: "CNSA" } },
  { pattern: /^SHIYAN/i, meta: { country: "China", operator: "CNSA", agency: "CNSA" } },
  { pattern: /^SHIJIAN/i, meta: { country: "China", operator: "CNSA", agency: "CNSA" } },
  { pattern: /^TIANTONG/i, meta: { country: "China", operator: "CNSA", agency: "China Satcom" } },
  { pattern: /^ZHONGXING|^CHINASAT/i, meta: { country: "China", operator: "China Satcom", agency: "China Satcom" } },
  { pattern: /^APSTAR/i, meta: { country: "China", operator: "APT Satellite", agency: "APT" } },
  { pattern: /^TIANWEN/i, meta: { country: "China", operator: "CNSA", agency: "CNSA" } },
  { pattern: /^CHANG'?E/i, meta: { country: "China", operator: "CNSA", agency: "CNSA" } },
  { pattern: /^SHENZHOU/i, meta: { country: "China", operator: "CNSA", agency: "China Manned Space" } },
  { pattern: /^TIANZHOU/i, meta: { country: "China", operator: "CNSA", agency: "China Manned Space" } },
  { pattern: /^WENTIAN|^MENGTIAN/i, meta: { country: "China", operator: "CNSA", agency: "China Manned Space" } },
  { pattern: /^JILIN/i, meta: { country: "China", operator: "Chang Guang Satellite", agency: "Commercial" } },
  { pattern: /^GEELY/i, meta: { country: "China", operator: "Geespace", agency: "Geely Group" } },
  { pattern: /^CZ-/i, meta: { country: "China", operator: "CASC", agency: "CNSA" } },

  // ═══════════════════════════════════════════════════════════════════════════
  // INDIA
  // ═══════════════════════════════════════════════════════════════════════════
  { pattern: /^IRNSS|^NAVIC/i, meta: { country: "India", operator: "ISRO", agency: "Indian Space Research Organisation" } },
  { pattern: /^CARTOSAT/i, meta: { country: "India", operator: "ISRO", agency: "ISRO" } },
  { pattern: /^RESOURCESAT/i, meta: { country: "India", operator: "ISRO", agency: "ISRO" } },
  { pattern: /^INSAT/i, meta: { country: "India", operator: "ISRO", agency: "ISRO" } },
  { pattern: /^GSAT/i, meta: { country: "India", operator: "ISRO", agency: "ISRO" } },
  { pattern: /^OCEANSAT/i, meta: { country: "India", operator: "ISRO", agency: "ISRO" } },
  { pattern: /^RISAT/i, meta: { country: "India", operator: "ISRO", agency: "ISRO" } },
  { pattern: /^CHANDRAYAAN/i, meta: { country: "India", operator: "ISRO", agency: "ISRO" } },
  { pattern: /^EOS[ -]/i, meta: { country: "India", operator: "ISRO", agency: "ISRO" } },
  { pattern: /^ASTROSAT/i, meta: { country: "India", operator: "ISRO", agency: "ISRO" } },
  { pattern: /^EMISAT/i, meta: { country: "India", operator: "DRDO", agency: "Indian MoD" } },

  // ═══════════════════════════════════════════════════════════════════════════
  // JAPAN
  // ═══════════════════════════════════════════════════════════════════════════
  { pattern: /^QZSS|^MICHIBIKI/i, meta: { country: "Japan", operator: "JAXA", agency: "Japan Aerospace Exploration Agency" } },
  { pattern: /^HIMAWARI/i, meta: { country: "Japan", operator: "JMA", agency: "Japan Meteorological Agency" } },
  { pattern: /^ALOS/i, meta: { country: "Japan", operator: "JAXA", agency: "JAXA" } },
  { pattern: /^HAYABUSA/i, meta: { country: "Japan", operator: "JAXA", agency: "JAXA" } },
  { pattern: /^JCSAT/i, meta: { country: "Japan", operator: "SKY Perfect JSAT", agency: "JSAT" } },
  { pattern: /^SUPERBIRD/i, meta: { country: "Japan", operator: "SKY Perfect JSAT", agency: "JSAT" } },
  { pattern: /^KIZUNA/i, meta: { country: "Japan", operator: "JAXA", agency: "JAXA" } },
  { pattern: /^GOSAT/i, meta: { country: "Japan", operator: "JAXA", agency: "JAXA/MOE" } },
  { pattern: /^IGS/i, meta: { country: "Japan", operator: "Cabinet Office", agency: "Japan MoD" } },
  { pattern: /^DSN[ -]/i, meta: { country: "Japan", operator: "JAXA", agency: "JAXA" } },
  { pattern: /^ETS[ -]/i, meta: { country: "Japan", operator: "JAXA", agency: "JAXA" } },
  { pattern: /^HTV/i, meta: { country: "Japan", operator: "JAXA", agency: "JAXA" } },

  // ═══════════════════════════════════════════════════════════════════════════
  // SOUTH KOREA
  // ═══════════════════════════════════════════════════════════════════════════
  { pattern: /^KOMPSAT|^ARIRANG/i, meta: { country: "South Korea", operator: "KARI", agency: "Korea Aerospace Research Institute" } },
  { pattern: /^KOREASAT|^MUGUNGHWA/i, meta: { country: "South Korea", operator: "KT SAT", agency: "KT Corporation" } },
  { pattern: /^CHEOLLIAN|^COMS/i, meta: { country: "South Korea", operator: "KMA/KARI", agency: "KMA" } },
  { pattern: /^NURI/i, meta: { country: "South Korea", operator: "KARI", agency: "KARI" } },

  // ═══════════════════════════════════════════════════════════════════════════
  // UNITED KINGDOM
  // ═══════════════════════════════════════════════════════════════════════════
  { pattern: /^ONEWEB/i, meta: { country: "United Kingdom", operator: "OneWeb", agency: "OneWeb" } },
  { pattern: /^SKYNET/i, meta: { country: "United Kingdom", operator: "UK MoD", agency: "Airbus Defence" } },
  { pattern: /^INMARSAT/i, meta: { country: "United Kingdom", operator: "Inmarsat", agency: "Inmarsat" } },

  // ═══════════════════════════════════════════════════════════════════════════
  // CANADA
  // ═══════════════════════════════════════════════════════════════════════════
  { pattern: /^TELESAT/i, meta: { country: "Canada", operator: "Telesat", agency: "Telesat" } },
  { pattern: /^RADARSAT/i, meta: { country: "Canada", operator: "CSA", agency: "Canadian Space Agency" } },
  { pattern: /^ANIK/i, meta: { country: "Canada", operator: "Telesat", agency: "Telesat" } },
  { pattern: /^SCISAT/i, meta: { country: "Canada", operator: "CSA", agency: "Canadian Space Agency" } },
  { pattern: /^CASSIOPE/i, meta: { country: "Canada", operator: "CSA", agency: "Canadian Space Agency" } },

  // ═══════════════════════════════════════════════════════════════════════════
  // MIDDLE EAST
  // ═══════════════════════════════════════════════════════════════════════════
  { pattern: /^TURKSAT/i, meta: { country: "Turkey", operator: "Turksat", agency: "Turksat A.S." } },
  { pattern: /^GOKTURK/i, meta: { country: "Turkey", operator: "TAI", agency: "Turkish MoD" } },
  { pattern: /^ARABSAT/i, meta: { country: "Saudi Arabia", operator: "Arabsat", agency: "Arab Satellite Communications" } },
  { pattern: /^NILESAT/i, meta: { country: "Egypt", operator: "Nilesat", agency: "Nilesat" } },
  { pattern: /^EGYPTSAT/i, meta: { country: "Egypt", operator: "NARSS", agency: "Egypt Space Agency" } },
  { pattern: /^AMOS/i, meta: { country: "Israel", operator: "Spacecom", agency: "Israel Aerospace Industries" } },
  { pattern: /^EROS/i, meta: { country: "Israel", operator: "ImageSat", agency: "IAI" } },
  { pattern: /^OFEQ|^OFEK/i, meta: { country: "Israel", operator: "ISA", agency: "Israeli MoD" } },
  { pattern: /^YAHSAT|^AL YAH/i, meta: { country: "UAE", operator: "Al Yah Satellite", agency: "Yahsat" } },
  { pattern: /^KHALIFASAT|^DUBAISAT/i, meta: { country: "UAE", operator: "MBRSC", agency: "Mohammed bin Rashid Space Centre" } },
  { pattern: /^BADR/i, meta: { country: "Saudi Arabia", operator: "Arabsat", agency: "Arabsat" } },
  { pattern: /^IRANSAT|^SAFIR/i, meta: { country: "Iran", operator: "ISA", agency: "Iranian Space Agency" } },
  { pattern: /^KHAYYAM/i, meta: { country: "Iran", operator: "ISA", agency: "Iranian Space Agency" } },

  // ═══════════════════════════════════════════════════════════════════════════
  // ASIA-PACIFIC
  // ═══════════════════════════════════════════════════════════════════════════
  { pattern: /^THAICOM/i, meta: { country: "Thailand", operator: "Thaicom", agency: "Thaicom PCL" } },
  { pattern: /^TELKOM/i, meta: { country: "Indonesia", operator: "Telkom Indonesia", agency: "Telkom" } },
  { pattern: /^PALAPA/i, meta: { country: "Indonesia", operator: "Indosat", agency: "Indonesia" } },
  { pattern: /^LAPAN/i, meta: { country: "Indonesia", operator: "LAPAN", agency: "Indonesian Space Agency" } },
  { pattern: /^VINASAT/i, meta: { country: "Vietnam", operator: "VNPT", agency: "Vietnam" } },
  { pattern: /^MEASAT/i, meta: { country: "Malaysia", operator: "MEASAT", agency: "MEASAT Global" } },
  { pattern: /^PAKSAT/i, meta: { country: "Pakistan", operator: "SUPARCO", agency: "SUPARCO" } },
  { pattern: /^BANGABANDHU/i, meta: { country: "Bangladesh", operator: "BTRC", agency: "Bangladesh" } },
  { pattern: /^ASIASAT/i, meta: { country: "Hong Kong", operator: "AsiaSat", agency: "AsiaSat" } },

  // ═══════════════════════════════════════════════════════════════════════════
  // SOUTH AMERICA
  // ═══════════════════════════════════════════════════════════════════════════
  { pattern: /^AMAZONAS/i, meta: { country: "Brazil", operator: "Hispasat", agency: "Hispasat/Brazil" } },
  { pattern: /^CBERS/i, meta: { country: "Brazil", operator: "INPE/CNSA", agency: "Brazil/China" } },
  { pattern: /^SCD/i, meta: { country: "Brazil", operator: "INPE", agency: "Brazilian Space Agency" } },
  { pattern: /^ARSAT/i, meta: { country: "Argentina", operator: "ARSAT", agency: "Argentina" } },
  { pattern: /^SAOCOM/i, meta: { country: "Argentina", operator: "CONAE", agency: "Argentine Space Agency" } },
  { pattern: /^SAC[ -]/i, meta: { country: "Argentina", operator: "CONAE", agency: "Argentine Space Agency" } },

  // ═══════════════════════════════════════════════════════════════════════════
  // AFRICA
  // ═══════════════════════════════════════════════════════════════════════════
  { pattern: /^NIGCOMSAT/i, meta: { country: "Nigeria", operator: "NIGCOMSAT", agency: "Nigeria" } },
  { pattern: /^RASCOM/i, meta: { country: "Africa", operator: "RASCOM", agency: "African Union" } },
  { pattern: /^ALCOMSAT/i, meta: { country: "Algeria", operator: "ASAL", agency: "Algerian Space Agency" } },
  { pattern: /^MOHAMMED.*VI/i, meta: { country: "Morocco", operator: "CRTS", agency: "Morocco" } },

  // ═══════════════════════════════════════════════════════════════════════════
  // AUSTRALIA / NEW ZEALAND
  // ═══════════════════════════════════════════════════════════════════════════
  { pattern: /^OPTUS/i, meta: { country: "Australia", operator: "Optus", agency: "Singtel Optus" } },
  { pattern: /^NBN/i, meta: { country: "Australia", operator: "NBN Co", agency: "Australia" } },

  // ═══════════════════════════════════════════════════════════════════════════
  // GENERIC INTERNATIONAL PATTERNS (catch common naming)
  // ═══════════════════════════════════════════════════════════════════════════
  { pattern: /^HISPASAT/i, meta: { country: "Spain", operator: "Hispasat", agency: "Hispasat" } },
  { pattern: /^HELLAS-?SAT/i, meta: { country: "Greece", operator: "Hellas Sat", agency: "Hellas Sat" } },
  { pattern: /^NORTSAT|^NORSAT/i, meta: { country: "Norway", operator: "Norwegian Space Agency", agency: "NOSA" } },
  { pattern: /^ICEYE/i, meta: { country: "Finland", operator: "ICEYE", agency: "ICEYE" } },
  { pattern: /^IRAN.*SAT/i, meta: { country: "Iran", operator: "ISA", agency: "Iranian Space Agency" } },

  // ═══════════════════════════════════════════════════════════════════════════
  // CATCH-ALL PATTERNS (by designation prefix from COSPAR/NORAD)
  // ═══════════════════════════════════════════════════════════════════════════
  { pattern: /^OBJECT\s/i, meta: { country: "Unknown", operator: "Debris/Unknown", agency: "N/A" } },
  { pattern: /^ROCKET\s?BODY|^R\/B/i, meta: { country: "Unknown", operator: "Spent Stage", agency: "N/A" } },
  { pattern: /^DEB\s|DEBRIS/i, meta: { country: "Unknown", operator: "Debris", agency: "N/A" } },
];

// ─── International Designator Prefix → Country (COSPAR codes) ────────────────
// When name patterns don't match, we can use the NORAD catalog number ranges
// or international designator to guess the country.

/**
 * Guess country from satellite name using common naming conventions.
 * This catches satellites that don't match specific patterns above.
 */
function guessCountryFromName(name: string): SatelliteMetadata | null {
  const upper = name.toUpperCase();

  // Chinese satellites often contain "CZ" (Chang Zheng rocket body) or numbers
  if (upper.startsWith("CZ-") || upper.startsWith("CHANG ZHENG")) {
    return { country: "China", operator: "CASC", agency: "CNSA" };
  }

  // Russian naming: often COSMOS + number, or Cyrillic transliterations
  if (/^(BREEZE|BRIZ|FREGAT|ROKOT|ANGARA|PROTON)/i.test(upper)) {
    return { country: "Russia", operator: "Roscosmos", agency: "Roscosmos" };
  }

  // Indian naming
  if (/^(PSLV|GSLV|SSLV)/i.test(upper)) {
    return { country: "India", operator: "ISRO", agency: "ISRO" };
  }

  // Japanese naming
  if (/^(H-II|H2|EPSILON)/i.test(upper)) {
    return { country: "Japan", operator: "JAXA", agency: "JAXA" };
  }

  // European (Ariane, Vega)
  if (/^(ARIANE|VEGA|SYLDA)/i.test(upper)) {
    return { country: "Europe", operator: "Arianespace", agency: "ESA" };
  }

  return null;
}

// ─── Category-based Defaults ─────────────────────────────────────────────────

const CATEGORY_DEFAULTS: Record<string, SatelliteMetadata> = {
  "space-stations": { country: "International", operator: "Multi-national", agency: "Various" },
  starlink: { country: "United States", operator: "SpaceX", agency: "SpaceX" },
  gps: { country: "United States", operator: "US Space Force", agency: "US DoD" },
  weather: { country: "International", operator: "Weather Agency", agency: "Various" },
  communication: { country: "International", operator: "Commercial Operator", agency: "Various" },
  "earth-observation": { country: "International", operator: "Space Agency", agency: "Various" },
  scientific: { country: "International", operator: "Space Agency", agency: "Various" },
  military: { country: "United States", operator: "US DoD", agency: "US Military" },
  debris: { country: "Unknown", operator: "N/A", agency: "N/A" },
};

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Get metadata for a satellite by NORAD ID and name.
 */
export function getSatelliteMetadata(
  noradId: number,
  name: string,
  category?: string
): SatelliteMetadata {
  // Check known satellites first
  if (KNOWN_SATELLITES[noradId]) {
    return KNOWN_SATELLITES[noradId];
  }

  // Match by name pattern
  for (const { pattern, meta } of COUNTRY_PATTERNS) {
    if (pattern.test(name)) {
      return meta;
    }
  }

  // Try guessing from name conventions
  const guessed = guessCountryFromName(name);
  if (guessed) return guessed;

  // Fall back to category default
  if (category && CATEGORY_DEFAULTS[category]) {
    return CATEGORY_DEFAULTS[category];
  }

  return { country: "Unknown", operator: "Unknown" };
}
