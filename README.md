# Polylight

Hello and welcome to **Polylight**, Polylight is a multi browser extension that lets you have a rainbow text highlighting color effect, don't specially want a rainbow highlight ? Worry not, you have the choice between solid colors and the RGB mode, in the solid color mode you have 6 presets with a section made to let you customize the color as you want it to be.

This is the remnant put back together with a nice UI and refactoring of an old extension I had made once to customize my highlight color and to add a rainbow effect, I hope you enjoy using it just as much as I do.

## Performance Warning
Because of how browsers handle text selection natively, there is no generic CSS way to animate highlighting without forcefully injecting and updating CSS pseudo-elements (`::selection`). To make the rainbow effect work, the extension rapidly rewrites a `<style>` block directly into the webpage's HTML multiple times a second. 

This is incredibly heavy for browser layout engines to handle and carries an inherent continuous CPU footprint while rainbow mode is enabled. I can't really do much about this natively without breaking the layout of the websites themselves, so it remains a known limitation of the RGB effect, but I did take all precautions to limit the impacts. (Also good to note that your result **may** change from mine as I'm using Firefox without hardware acceleration from what I know (meaning it doesn't use the GPU to be quicker), but maybe I'm wrong, and it'll always hammer the CPU, like any browser activity)

## Features
* **Smooth Rainbow Mode:** Custom time based loop to keep color shifts stable across webpages.
* **Solid Color Mode:** Switch to a solid color and build your own custom preset library. The CPU impact drops to zero while in this mode because it only refreshes it once.
* **Smart Contrast:** Text dynamically snaps to white or black only if the highlight combination becomes unreadable based on WCAG AAA standards.
* **Granular UI:** Matte charcoal interface with granular sliders for speed, opacity, saturation, lightness, and because I prefer minimalism.

## Installation

### Building from source

You will need [Node.js](https://nodejs.org/) installed to build the project.

1. Clone or download the repository.
2. Open a terminal in the project directory.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Build the extension:
   ```bash
   npm run build
   ```

A `dist/` directory will be created, this is the unpacked extension folder you'll load into your browser.

---

### Loading in Chrome / Chromium

1. Go to `chrome://extensions`
2. Enable **Developer Mode** (toggle in the top right)
3. Click **Load unpacked**
4. Select the `dist/` folder

> Chrome may warn you about unsigned extensions. This is expected — just dismiss the warning.

---

### Loading in Firefox

Firefox's stable release enforces add-on signing and **will not** allow permanently loading unsigned extensions.

**Temporary install (any Firefox):**
1. Go to `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-On**
3. Select the `manifest.json` inside the `dist/` folder

> ⚠️ Temporary installs are removed when Firefox closes.

**Permanent install (Firefox Developer Edition / Nightly only):**
1. Go to `about:config`
2. Set `xpinstall.signatures.required` to `false`
3. Then follow the temporary install steps above — the extension will now persist

For more details, see [Mozilla's official documentation on unsigned add-ons](https://support.mozilla.org/en-US/kb/add-on-signing-in-firefox#w_what-are-my-options-if-i-want-to-use-an-unsigned-add-on-advanced-user).

Else you'll have to wait for when i will be able to publish the Polylight on both browser extensions official marketplaces.