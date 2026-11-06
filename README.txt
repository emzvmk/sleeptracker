Sleep Tracker - deploy on GitHub Pages
1. Create a repo and upload the files in this folder to the ROOT of the repo
   (index.html must sit at the top level, not inside a subfolder). Include the hidden .nojekyll file.
2. Settings > Pages > Source: "Deploy from a branch", branch main, folder / (root).
3. Open https://<username>.github.io/<repo>/ after the deployment finishes (usually 1-2 minutes).

Local use: open index.html in a browser.
APK (Capacitor): npm init -y && npm i @capacitor/core @capacitor/cli @capacitor/android
  npx cap init SleepTracker com.example.sleeptracker --web-dir=. && npx cap add android && npx cap sync && npx cap open android
