// Hand-maintained approach cameras, one per side of each crossing.
// Like crossing-info.js, this is curated by a human and verified against the
// source at build time — it is NOT scraped and the site never re-hosts or
// stores the images. The browser loads each still directly from the agency
// that publishes it, so the picture is always the agency's own live frame and
// we carry no image cost.
//
// WHY ONE CAMERA PER DIRECTION (not a wall of them): the two agencies publish
// dozens of cameras per corridor. A calm signage screen shows the single most
// useful one — the queue you actually sit in. Because the page already asks
// which way you're going, we map the direction to the side the line forms on:
//
//   to_canada  (heading into Canada) → the U.S.-side approach  (MDOT Mi Drive)
//   to_us      (heading into the U.S.) → the Canadian-side approach (Ontario 511)
//
// IMAGE URLS, verified 2026-07-07 (each returned image/jpeg, http 200):
//   • Ontario 511: the camera view URL IS the live JPEG
//     (https://511on.ca/map/Cctv/{viewId}; ~20s refresh, CORS open).
//   • MDOT Mi Drive: the still is the camera's `link`, discovered once via
//     /MiDrive/camera/getCameraInformation/{id} and stable per camera
//     (https://micamerasimages.net/thumbs/semtoc_cam_NNN.flv.jpg).
// If a camera moves or a feed changes, re-verify and update here by hand.
//
// CREDIT: every camera names its source in its caption, and both agencies are
// listed in the page's sources footer.

const MDOT = { network: 'mdot mi drive', page: 'https://mdotjboss.state.mi.us/MiDrive/map', flag: 'us' };
const ON511 = { network: 'ontario 511', page: 'https://511on.ca/map', flag: 'ca' };

export const CAMERAS = {
  'ambassador-bridge': {
    to_canada: {
      image: 'https://micamerasimages.net/thumbs/semtoc_cam_081.flv.jpg?item=1',
      where: 'i-75 at the bridge approach · detroit',
      ...MDOT,
    },
    to_us: {
      image: 'https://511on.ca/map/Cctv/2820',
      where: 'near the bridge plaza · windsor',
      ...ON511,
    },
  },
  'detroit-windsor-tunnel': {
    to_canada: {
      image: 'https://micamerasimages.net/thumbs/semtoc_cam_251.flv.jpg?item=1',
      where: 'tunnel entrance · detroit',
      ...MDOT,
    },
    to_us: {
      image: 'https://511on.ca/map/Cctv/1511',
      where: 'tunnel plaza · windsor',
      ...ON511,
    },
  },
  'blue-water-bridge': {
    to_canada: {
      image: 'https://micamerasimages.net/thumbs/semtoc_cam_213.flv.jpg?item=1',
      where: 'i-94 approach · port huron',
      ...MDOT,
    },
    to_us: {
      image: 'https://511on.ca/map/Cctv/2414',
      where: 'hwy 402 approach · sarnia',
      ...ON511,
    },
  },
};
