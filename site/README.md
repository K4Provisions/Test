# K4 Provisions LLC website

A static site: plain HTML, CSS and JavaScript, with no build step. Open `index.html` through any web server, or upload the `site` folder to any static host (Netlify, Cloudflare Pages, GitHub Pages).

## Before going live

1. **Quote form email.** In `assets/js/main.js`, set `FORM_ENDPOINT` to a form service URL, for example
   `https://formsubmit.co/ajax/you@yourbusiness.com` (the first submission sends you a confirmation email).
   Until it is set, the form opens a pre-filled text message to (214) 931-7844.
2. **Logo.** The header uses a text wordmark. Drop a transparent logo file in `assets/img/` and swap it into the `.wordmark` link in `index.html`.
3. **Photos.** Add real before-and-after job photos when you have them.
4. **Certification.** Once NFPA 96 certification is complete, mention it in the hero and FAQ.

## How the 3D animation works

`assets/js/hood-scene.js` builds the hood, filters, duct and rooftop fan with Three.js (bundled locally in `assets/js/three.module.min.js`). Scroll position drives a value from 0 to 6 that moves the camera and cleans the grease step by step.

- It loads after the page appears, so the text and buttons are usable right away.
- Phones and low-power devices get fewer particles and a lower render resolution.
- It pauses when the section is off screen or the tab is hidden.
- With "reduce motion" turned on, it jumps between steps instead of moving continuously.
- Devices without WebGL see a static illustration instead.

Add `?still` to the URL to render only while scrolling (useful for screenshots).
