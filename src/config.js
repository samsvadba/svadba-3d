/* =========================================================
   SIMONA & MARTIN
   Wedding app configuration
========================================================= */

(function (global) {

  'use strict'

  /* =======================================================
     TEXTS
  ======================================================= */

  const translations = {

    sk: {

      journeySub:
        'A journey of us',

      introLine1:
        'A journey of us,',

      introLine2:
        'captured in every moment.',

      explore:
        'Explore',

      spinLine1:
        'Roztočte glóbus a objavte naše spoločné chvíle.',

      spinLine2:
        'Vyberte mesto a začnite.',

      adventureLine1:
        'And now,',

      adventureLine2:
        'Our new adventure begins.',

      weddingDate:
        '30. APRÍL 2027',

      months:
        'Mesiacov',

      days:
        'Dní',

      hours:
        'Hodín',

      mins:
        'Minút',

      secs:
        'Sekúnd',

      ceremony:
        'Naša svadba',

      at:
        'OBRAD',

      address:
        'KOSTOL SV. JAKUBA<br>TRNAVA',

      navIntro:
        'INTRO',

      navJourney:
        'JOURNEY',

      navWedding:
        'WEDDING',

      selectCity:
        'VYBERTE MESTO',

      rsvpBtn:
        'RSVP',

      detail:
        'DETAIL',

      timeline:
        'TIMELINE',

      menu:
        'MENU',

      seat:
        'SEAT',

      faq:
        'FAQ',

      gallery:
        'GALLERY',

      scroll:
        'SCROLL',

      videoSkip:
        'SKIP',

      ceremonyTitle:
        'Kostol sv. Jakuba',

      ceremonyAddress:
        'Františkánska 1, Trnava',

      ceremonyTime:
        '15:00',

      receptionTitle:
        'Zemiansky dvor',

      receptionAddress:
        'Krakovská 67, Šúrovce',

      receptionTime:
        'Po obrade',

      timelineGathering:
        'Stretnutie hostí',

      timelineCeremony:
        'Svadobný obrad',

      timelineReception:
        'Príchod na hostinu',

      timelineDinner:
        'Večera',

      timelineParty:
        'Oslava',

      rsvpTitle:
        'RSVP',

      rsvpSubtitle:
        'Dajte nám vedieť, či budete pri tom s nami.',

      rsvpName:
        'Meno a priezvisko',

      rsvpContact:
        'E-mail alebo telefón',

      rsvpAttending:
        'Zúčastníte sa?',

      rsvpYes:
        'Áno',

      rsvpNo:
        'Nie',

      rsvpGuests:
        'Počet hostí',

      rsvpDietary:
        'Stravovacie obmedzenia',

      rsvpMessage:
        'Odkaz pre nás',

      rsvpSubmit:
        'Odoslať RSVP',

      rsvpSending:
        'Odosielam...',

      rsvpThankYou:
        'Ďakujeme!',

      rsvpConfirm:
        'Vašu odpoveď sme zaznamenali.',

      rsvpDone:
        'Hotovo',

      rsvpError:
        'Niečo sa nepodarilo. Skúste to znova.'

    }

  }

  /* =======================================================
     JOURNEY LOCATIONS

     side / x / top použijeme neskôr rovnako ako
     reference na rozmiestnenie labelov okolo glóbusu.
  ======================================================= */

  const locations = [

  {
    key: 'london',
    name: 'London',
    subname: 'United Kingdom',

    lat: 51.5074,
    lon: -0.1278,

    side: 'left',
    x: '7%',
    top: '29%',

    type: 'image',
    media: 'photos/02-west-ham.jpeg'
  },

  {
    key: 'madeira',
    name: 'Madeira',
    subname: 'Portugal',

    lat: 32.7607,
    lon: -16.9595,

    side: 'left',
    x: '4%',
    top: '47%',

    type: 'image',
    media: 'photos/03-madeira-waterfall.jpeg'
  },

  {
    key: 'sevilla',
    name: 'Sevilla',
    subname: 'Spain',

    lat: 37.3891,
    lon: -5.9845,

    side: 'left',
    x: '8%',
    top: '65%',

    type: 'image',
    media: 'photos/03-madeira-waterfall.jpeg'
  },

  {
    key: 'firenze',
    name: 'Firenze',
    subname: '01 · 04 · 2026',

    lat: 43.7696,
    lon: 11.2558,

    side: 'right',
    x: '8%',
    top: '25%',

    type: 'image',
    media: 'photos/07-florence-engagement.jpeg',

    special: 'engagement'
  },

  {
    key: 'granada',
    name: 'Granada',
    subname: 'Spain',

    lat: 37.1773,
    lon: -3.5986,

    side: 'right',
    x: '5%',
    top: '43%',

    type: 'image',
    media: 'photos/08-formal-outdoor.jpeg'
  },

  {
    key: 'malaga',
    name: 'Málaga',
    subname: 'Spain',

    lat: 36.7213,
    lon: -4.4214,

    side: 'right',
    x: '9%',
    top: '61%',

    type: 'image',
    media: 'photos/01-historic-selfie.jpeg'
  },

  {
    key: 'tokyo',
    name: 'Tokyo',
    subname: 'Japan',

    lat: 35.6762,
    lon: 139.6503,

    side: 'right',
    x: '13%',
    top: '74%',

    type: 'instagram',

    media:
      'https://www.instagram.com/reel/DN_BgiWktOJ/embed/',

    external:
      'https://www.instagram.com/reel/DN_BgiWktOJ/'
  }

]

  /* =======================================================
     WEDDING
  ======================================================= */

  const wedding = {

    couple: {
      first:
        'Simona',

      second:
        'Martin',

      full:
        'Simona & Martin'
    },

    date:
      '2027-04-30T15:00:00+02:00',

    dateLabel:
      '30. 04. 2027',

    ceremony: {

      name:
        'Kostol sv. Jakuba',

      address:
        'Františkánska 1, 917 01 Trnava',

      time:
        '15:00',

      maps:
        'https://maps.google.com/?q=Kostol+sv.+Jakuba,+Františkánska+1,+Trnava'

    },

    reception: {

      name:
        'Zemiansky dvor',

      address:
        'Krakovská 67, 919 25 Šúrovce',

      time:
        'Po obrade',

      maps:
        'https://maps.google.com/?q=Penzion+Zemiansky+dvor,+Krakovska+67,+Surovce'

    },

    gathering: {

      time:
        '14:00',

      place:
        'Šúrovce'

    }

  }

  /* =======================================================
     TIMELINE
  ======================================================= */

  const timeline = [

    {
      time:
        '14:00',

      icon:
        'groups',

      label:
        'Stretnutie hostí'
    },

    {
      time:
        '15:00',

      icon:
        'favorite',

      label:
        'Svadobný obrad'
    },

    {
      time:
        'Po obrade',

      icon:
        'directions_bus',

      label:
        'Presun do Šúroviec'
    },

    {
      time:
        'Večer',

      icon:
        'restaurant',

      label:
        'Hostina'
    },

    {
      time:
        'Noc',

      icon:
        'celebration',

      label:
        'Oslava'
    }

  ]

  /* =======================================================
     EXTERNAL SERVICES
  ======================================================= */

  const services = {

    rsvpEndpoint:
      'https://script.google.com/macros/s/AKfycbw1rK7Ihb3XUxz0ab5tx9l3Le5j0V8xbl72BRsg_dRdHGy6Z0PCzWhZzRyagxTa3KGrlg/exec',

    galleryEndpoint:
      ''

  }

  /* =======================================================
     GLOBAL CONFIG
  ======================================================= */

  global.WeddingApp =
    global.WeddingApp ||
    {}

  global.WeddingApp.config = {

    translations,

    locations,

    wedding,

    timeline,

    GLOBE_RADIUS:
      12,

    targetDate:
      new Date(
        'April 30, 2027 15:00:00 GMT+0200'
      ),

    APPS_SCRIPT_URL:
      services.rsvpEndpoint,

    GALLERY_SCRIPT_URL:
      services.galleryEndpoint,

    THREE_BASE:
      'https://unpkg.com/three@0.180.0'

  }

})(window)
