Sleep Tracker - HTML/CSS/JS (no backend, data in LocalStorage)

Files: index.html, style.css, script.js, chart.umd.js (Chart.js, bundled so it works offline)
Run: open index.html in a browser (or serve the folder with any static server).

Convert to Android APK (Capacitor):
  npm init -y && npm i @capacitor/core @capacitor/cli @capacitor/android
  npx cap init SleepTracker com.example.sleeptracker --web-dir=.
  npx cap add android && npx cap sync && npx cap open android
Then build the APK from Android Studio (Build > Build APK).
