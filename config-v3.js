const config = {
  "translations": {
    "sk": {
      "journeySub": "A journey of us",
      "explore": "Explore",
      "spinLine1": "Roztočte glóbus a objavte naše spoločné chvíle.",
      "spinLine2": "Vyberte mesto a začnite.",
      "adventureLine1": "And now,",
      "adventureLine2": "Our new adventure begins.",
      "navIntro": "INTRO",
      "navJourney": "JOURNEY",
      "navWedding": "WEDDING",
      "selectCity": "VYBERTE MESTO",
      "introLine1": "Dve cesty.",
      "introLine2": "Jeden spoločný príbeh."
    }
  },
  "locations": [
    {
      "key": "granada",
      "name": "Granada",
      "subname": "Španielsko",
      "lat": 37.1773,
      "lon": -3.5986,
      "side": "left",
      "x": "6%",
      "top": "15%",
      "type": "image",
      "media": "photos/01-historic-selfie.jpeg"
    },
    {
      "key": "trnava",
      "name": "Trnava",
      "subname": "Náš domov",
      "lat": 48.3774,
      "lon": 17.5883,
      "side": "left",
      "x": "6%",
      "top": "24%",
      "type": "image",
      "media": "photos/08-formal-outdoor.jpeg",
      "description": "Naše mesto, kde sme sa rozhodli žiť."
    },
    {
      "key": "london",
      "name": "London",
      "subname": "United Kingdom",
      "lat": 51.5074,
      "lon": -0.1278,
      "side": "left",
      "x": "6%",
      "top": "33%",
      "type": "image",
      "media": "photos/02-west-ham.jpeg"
    },
    {
      "key": "madeira",
      "name": "Madeira",
      "subname": "Portugal",
      "lat": 32.7607,
      "lon": -16.9595,
      "side": "left",
      "x": "6%",
      "top": "42%",
      "type": "image",
      "media": "photos/03-madeira-waterfall.jpeg"
    },
    {
      "key": "liverpool",
      "name": "Liverpool",
      "subname": "United Kingdom",
      "lat": 53.4084,
      "lon": -2.9916,
      "side": "left",
      "x": "6%",
      "top": "51%",
      "type": "image",
      "media": "photos/06-liverpool-waterfront.jpeg"
    },
    {
      "key": "tokyo",
      "instagramLabel": "Viac z našej cesty v Tokiu",
      "instagramHighlight": "https://www.instagram.com/s/aGlnaGxpZ2h0OjE4MDYzMzQwNDUxMzQ3Mzk2?story_media_id=3706699429817129931&stkn=aWN5Y2YzeHF2eTB3",
      "fullscreenVideo": "https://res.cloudinary.com/kxksv8hk/video/upload/w_1080,q_auto,f_auto/IMG_7011",
      "name": "Tokyo",
      "subname": "Japan",
      "lat": 35.6762,
      "lon": 139.6503,
      "side": "left",
      "x": "6%",
      "top": "60%",
      "type": "instagram",
      "media": "https://www.instagram.com/reel/DN_BgiWktOJ/embed/",
      "external": "https://www.instagram.com/reel/DN_BgiWktOJ/"
    },
    {
      "key": "firenze",
      "name": "Firenze",
      "subname": "01 · 04 · 2026",
      "lat": 43.7696,
      "lon": 11.2558,
      "side": "right",
      "x": "6%",
      "top": "15%",
      "type": "image",
      "media": "photos/07-florence-engagement.jpeg",
      "special": "engagement"
    },
    {
      "key": "malaga",
      "name": "Málaga",
      "subname": "Španielsko",
      "lat": 36.7213,
      "lon": -4.4214,
      "type": "text",
      "side": "right",
      "x": "6%",
      "top": "24%"
    },
    {
      "key": "sevilla",
      "name": "Sevilla",
      "subname": "Španielsko",
      "lat": 37.3891,
      "lon": -5.9845,
      "type": "text",
      "side": "right",
      "x": "6%",
      "top": "33%"
    },
    {
      "key": "seoul",
      "name": "Soul",
      "subname": "Južná Kórea",
      "lat": 37.5665,
      "lon": 126.978,
      "type": "text",
      "side": "right",
      "x": "6%",
      "top": "42%"
    },
    {
      "key": "beijing",
      "name": "Peking",
      "subname": "Čína",
      "lat": 39.9042,
      "lon": 116.4074,
      "type": "text",
      "side": "right",
      "x": "6%",
      "top": "51%"
    },
    {
      "key": "sardinia",
      "name": "Sardínia",
      "subname": "Taliansko",
      "lat": 40.12,
      "lon": 9.01,
      "type": "text",
      "side": "right",
      "x": "6%",
      "top": "60%"
    }
  ],
  "GLOBE_RADIUS": 12,
  "intro": {
    "poster": "photos/07-florence-engagement.jpeg",
    "video": "Intro.mp4.mp4"
  },
  "wedding": {
    "couple": {
      "first": "Simona",
      "second": "Martin",
      "full": "Simona & Martin"
    },
    "dateLabel": "30 · 04 · 2027",
    "url": "https://samsvadba.github.io/svadba/"
  }
};
config.audio={backgroundMusic:null};
config.gallery={url:null};
config.ui={
sk:{skip:'Preskočiť',loading:'Načítavanie',explore:'Explore',intro1:'Dve cesty.',intro2:'Jeden spoločný príbeh.',journey1:'Roztočte glóbus a objavte naše spoločné chvíle.',journey2:'Vyberte mesto a začnite.',prepare:'Pripravujeme glóbus našich ciest.',select:'Vyberte mesto alebo otočte glóbus.',canvas:'Glóbus: potiahnutím otáčajte, dvoma prstami približujte; mesto vyberiete aj tlačidlom.',fallback:'Glóbus sa nepodarilo zobraziť. Spomienky otvoríte výberom mesta.',videoLoading:'Načítavam spomienku…',videoTap:'Ťuknutím spustíte video.',videoError:'Video sa nepodarilo načítať.',play:'Prehrať video',back:'Späť na Journey',close:'Zatvoriť spomienku',imageError:'Fotografiu sa nepodarilo načítať.',instagram:'POZRIEŤ NA INSTAGRAME ↗',more:'Viac z našej cesty',gallery:'Fotografie zo svadby už čoskoro.',photos:'Svadobné fotografie',soundOn:'Vypnúť hudbu',soundOff:'Zapnúť hudbu',noMusic:'Hudbu doplníme čoskoro.',dark:'Prepnúť na tmavú náladu',light:'Prepnúť na svetlú náladu',language:'Switch to English',controls:'Globálne ovládanie',next:'Ďalšia',wedding:'Naša svadba',engagement:'Zásnuby',memory:'Spomienka',of:'zo',videoMemory:'Video spomienka.',final1:'A teraz,',final2:'Začína sa naše nové dobrodružstvo.',handoff:'Pokračovať na svadobný web',redirect:'Pokračujeme na svadobný web.',home:'Simona a Martin — späť na intro',navigation:'Navigácia príbehu',cities:'Mestá'},
en:{skip:'Skip',loading:'Loading',explore:'Explore',intro1:'Two paths.',intro2:'One shared story.',journey1:'Spin the globe and discover our moments together.',journey2:'Choose a city to begin.',prepare:'Preparing the globe of our travels.',select:'Choose a city or rotate the globe.',canvas:'Globe: drag to rotate, pinch to zoom; you can also select a city using its button.',fallback:'The globe could not load. Select a city to open a memory.',videoLoading:'Loading our memory…',videoTap:'Tap to play the video.',videoError:'The video could not load.',play:'Play video',back:'Back to Journey',close:'Close memory',imageError:'The photo could not load.',instagram:'VIEW ON INSTAGRAM ↗',more:'More from our journey',gallery:'Wedding photos coming soon.',photos:'Wedding photos',soundOn:'Turn music off',soundOff:'Turn music on',noMusic:'Music is coming soon.',dark:'Switch to dark mood',light:'Switch to light mood',language:'Prepnúť do slovenčiny',controls:'Global controls',next:'Next',wedding:'Our wedding',engagement:'Engagement',memory:'Memory',of:'of',videoMemory:'Video memory.',final1:'And now,',final2:'Our new adventure begins.',handoff:'Continue to our wedding website',redirect:'Continuing to our wedding website.',home:'Simona and Martin — back to intro',navigation:'Story navigation',cities:'Cities'}
};
config.locations.find(l=>l.key==='tokyo').instagramLabel={sk:'Viac z našej cesty v Tokiu',en:'More from our journey in Tokyo'};
config.locations.find(l=>l.key==='trnava').descriptionEn='Our city, where we decided to make our home.';
config.countryEnglish={granada:'Spain',trnava:'Our home',malaga:'Spain',sevilla:'Spain',seoul:'South Korea',beijing:'China',sardinia:'Italy'};
export default config;
