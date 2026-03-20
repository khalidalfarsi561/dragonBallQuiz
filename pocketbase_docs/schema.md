# PocketBase Schema (مرجع إعداد المجموعات)

هذا الملف مرجع عملي لإعداد Collections داخل لوحة تحكم PocketBase لاحقاً.

> ملاحظة: PocketBase يعمل كخدمة/ملف تنفيذي مستقل، لذلك هذا التوثيق يصف الإعدادات التي سيتم إدخالها يدوياً (أو عبر migrations لاحقاً إن رغبت).

---

## 1) Users (Auth Collection)

**النوع:** Auth (Users)

### الحقول الإضافية (Custom Fields)

| الحقل | النوع | مطلوب | الافتراضي | ملاحظات |
|------|------|------|-----------|---------|
| `power_level` | Number | نعم | `0` | مستوى الطاقة الحالي للمستخدم |
| `zenkai_boosts` | Number | نعم | `0` | عدد/رصيد تعزيزات الزنكاي |
| `active_zenkai_multiplier` | Number | نعم | `0` | مضاعف الزنكاي الحالي (مثال: 0.2 = +20%) |
| `zenkai_attempts_left` | Number | نعم | `0` | عدد المحاولات المتبقية للاستفادة من الزنكاي |
| `current_form` | Text | نعم | `Base` | الشكل الحالي (مثل: Base / SSJ / SSJ2 ...) |
| `skill_points` | Number | نعم | `0` | نقاط المهارة المكتسبة (RPG) |
| `unlocked_skills` | JSON | لا | `{}` أو `[]` | مهارات مفتوحة (مثال: `["kamehameha"]`) |
| `daily_quests` | JSON | لا | `{}` | تقدم المهام اليومية (يُدار من الخادم) |
| `last_login` | Text | لا | `""` | تاريخ آخر تسجيل دخول (YYYY-MM-DD) لتتبع اليوميات |

### ملاحظة أمنية (قاعدة API لمنع التلاعب)

**هدف القاعدة:** منع المستخدم من تعديل `power_level` و `skill_points` (وأي حقول حساسة مشابهة) مباشرة من العميل.

اقتراح قواعد PocketBase — اضبطها من لوحة القواعد:

- **Update API Rule (مطلوب):**
  - **استخدم معامل `:isset` لمنع تعديل الحقول الحساسة إن كانت موجودة في الطلب.**
  - اكتبها بوضوح هكذا (كما هي):
    - `@request.data.power_level:isset = false && @request.data.skill_points:isset = false`
  - مع بقية شروط الأمان (مثل تحقق هوية المستخدم) بحسب احتياجك.

> ملاحظة: هذه الصياغة تمنع المستخدم من إرسال هذين الحقلين في أي طلب Update عبر الـ API العام، وبالتالي تمنع التلاعب المباشر بالطاقة/النقاط.

---

## توصية معمارية (تطبيع البيانات ومنع تضخم Auth Record)

مع نمو اللعبة، من الأفضل **فصل جدول Users إلى ثلاث مجموعات** لتقليل التعارضات (Database Locks) ومنع تضخم سجل المستخدم:

1) **Users (Auth Collection)**  
   للبيانات الشخصية/الثابتة (username, email, avatar, preferences...)

2) **Player_Stats (Base Collection)**  
   لإحصائيات تتغير بسرعة وبشكل متكرر مثل:
   - `power_level`
   - `zenkai_boosts`
   - `active_zenkai_multiplier`
   - `zenkai_attempts_left`
   - `current_form`
   - `skill_points`

3) **Daily_Activity (Base Collection)**  
   لتقدم اليوميات وما يتغير يومياً مثل:
   - `daily_quests`
   - `last_login`
   - أي counters/flags يومية

الفائدة:
- تقليل حجم Auth record نفسه
- تقليل احتمال تصادم تحديثات متعددة على نفس السجل
- تحسين الأداء على القراءة/الكتابة (خصوصاً مع تحديثات متكررة أثناء اللعب)

---

## 2) Questions (Base Collection)

**النوع:** Base

### الحقول

| الحقل | النوع | مطلوب | ملاحظات |
|------|------|------|---------|
| `content` | Text | نعم | نص السؤال |
| `options` | JSON | نعم | مصفوفة الخيارات (مثال: `["A","B","C","D"]`) |
| `correct_answer` | Text | نعم | الإجابة الصحيحة (لا تُرسل للواجهة الأمامية أبداً) |
| `difficulty_tier` | Number | نعم | مستوى الصعوبة (مثال: 1-5) |

---

## 3) Leaderboard (Base Collection)

**النوع:** Base

### الحقول

| الحقل | النوع | مطلوب | ملاحظات |
|------|------|------|---------|
| `user` | Relation -> Users | نعم | علاقة إلى مستخدم واحد |
| `score` | Number | نعم | مجموع النقاط |
| `streak` | Number | نعم | سلسلة الإجابات الصحيحة |
| `consecutive_wrong` | Number | نعم | `0` | عدد الإجابات الخاطئة المتتالية (لاحتساب Zenkai بشكل صحيح) |

---
