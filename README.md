# المترجم الفوري — Instant Translator

موقع ويب + **وكيل سطح مكتب يعمل في الخلفية**: تكتب بالعربية في *أي* تطبيق (متصفح، بريد، محادثة، مربع بحث…) وبعد لحظة صمت يُمحى النص العربي وتُكتب الترجمة في مكانه مباشرة — على مستوى نظام التشغيل كله.

A Next.js 16 web console **plus a system-wide desktop agent** (Windows / macOS / Linux) that watches your keyboard, translates Arabic typing in **any** application, and replaces it in place with the translation.

---

## ✨ المميزات

- 🖥️ **تطبيق سطح مكتب رسومي** (`translator_app.py`): زر تشغيل/إيقاف، ١٤ لغة، شريط مدة من ثانية إلى ٥ دقائق، عدّادات وسجل حي، تصغير لأيقونة النظام
- ⌨️ **نسخة طرفية خلفية** (`translator_agent.py`) للمحترفين
- ⚡ ترجمة لحظية بمحركين (إن تعذّر الأول يعمل الثاني) مع تخزين مؤقت على الخادم والمتصفح
- 🌐 محرر ويب فوري + محاكاة بيئة سطح مكتب داخل المتصفح (بحث / بريد / دردشة)
- 🗃️ سجل ترجمات في PostgreSQL مع إحصاءات، ولوحة حالة ترصد اتصال الوكيل لحظيًا
- 📦 بناء `InstantTranslator.exe` مستقل لا يحتاج بايثون (`build-windows-exe.bat`)

## 🗂️ هيكل المشروع

```
src/app/                 موقع Next.js (واجهة عربية RTL)
src/app/api/translate/   proxy الترجمة اللحظية
src/app/api/history/     سجل الترجمات (PostgreSQL عبر Drizzle)
src/app/api/agent/       مزامنة حالة وكيل سطح المكتب
public/agent/            ملفات الوكيل القابلة للتحميل:
  ├─ translator_app.py       ← التطبيق الرسومي (الأسهل)
  ├─ translator_agent.py     ← نسخة الطرفية
  ├─ agent_selftest.py       ← فحص ذاتي خلال ٦٠ ثانية
  ├─ install-windows.bat     ← تثبيت ويندوز بنقرة
  ├─ build-windows-exe.bat   ← بناء EXE مستقل
  └─ agent-mac-linux.sh      ← تثبيت ماك / لينكس
```

## 🚀 التشغيل المحلي (الموقع)

المتطلبات: **Node 20+** و **PostgreSQL** (محلي أو Neon).

```bash
npm install
cp .env.example .env        # عدّل DATABASE_URL
npx drizzle-kit push        # إنشاء الجداول
npm run dev                 # http://localhost:3000
```

إنتاجيًا: `npm run build && npm start`

## ☁️ النشر (أي شخص يدخل الموقع)

### الخيار الموصى به: Vercel + Neon (مجاني)

1. ادفع المشروع إلى GitHub (الأوامر بالأسفل)
2. أنشئ قاعدة مجانية على [neon.tech](https://neon.tech) وانسخ رابط الاتصال
3. من طرفيتك، طبّق الجداول على القاعدة السحابية (الإعداد يقرأ `DATABASE_URL`):
   ```bash
   DATABASE_URL="postgresql://...neon..." npx drizzle-kit push
   ```
4. على [vercel.com](https://vercel.com): **Add New → Project → Import GitHub Repository**، أضف متغير البيئة `DATABASE_URL` ثم **Deploy**
5. موقعك يعمل على `https://your-app.vercel.app` — ملفات الوكيل تُحمَّل من `/agent/...`

> GitHub Pages **لا تكفي** وحدها لأن التطبيق يحتاج مسارات خادم (`/api/*`) وقاعدة بيانات — استخدم Vercel أو Railway.

### بديل: Railway
**New Project → Deploy from GitHub Repo** ثم أضف إضافة **PostgreSQL** واربط متغير `DATABASE_URL`، وشغّل `npx drizzle-kit push` مرة واحدة من التبويب Settings → Deploy Command أو من طرفيتك.

## 🖥️ تطبيق سطح المكتب (للمستخدم النهائي)

| النظام | الخطوات |
|---|---|
| ويندوز | حمّل `translator_app.py` + `install-windows.bat`، شغّل المثبّت مرة واحدة — يفتح التطبيق الرسومي ويضيفه لبدء التشغيل التلقائي |
| ماك | حمّل `translator_app.py` + `agent-mac-linux.sh` ثم `chmod +x` وتشغيل، وامنح صلاحيتي Accessibility و Input Monitoring |
| لينكس | نفس سكربت ماك/لينكس على جلسة X11، مع `sudo apt install python3-tk` إن غابت الواجهة |

- اكتب بالعربية بأي تطبيق → توقّف → يُستبدل بالترجمة في مكانه
- `F8` إيقاف/استئناف · `F9` ترجمة فورية · `F6/F7` ضبط مدة الصمت
- لمشاركته مع من لا يملك بايثون: شغّل `build-windows-exe.bat` ووزّع `dist\InstantTranslator.exe`

## 🔒 الخصوصية

الوكيل لا يرسل سوى الجملة العربية نفسها لمحرك الترجمة لحظة الاستبدال. لا تُجمع بيانات أخرى، ولا تُخزَّن ضغطات المفاتيح — المخزن المؤقت في الذاكرة فقط ويمسح عند كل Enter أو نقرة. ضبط `CONSOLE_URL` في ملف الوكيل لعنوان موقعك يفعّل لوحة الحالة (اختياري).

## 📜 الرخصة

MIT — انظر [LICENSE](./LICENSE).
