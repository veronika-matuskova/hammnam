# hamMňam

hamMňam is a recipe book that keeps the nutritional values of every recipe at hand: carbohydrate units (SJ), carbohydrates, calories, the glycemic index and more. The app is in Slovak.

Open it at **[hammnam.app](https://hammnam.app)**.

## Install it on your phone

hamMňam works in the browser, and you can also add it to your home screen so it opens like an app:

- **iPhone (Safari):** tap Share, then **Add to Home Screen**.
- **Android (Chrome):** open the menu (⋮), then **Install app** or **Add to Home screen**.

Once you've opened the app, it starts even without a connection. Recipes are loaded from and saved to the internet, so viewing the latest recipes and saving changes need a connection.

## Browse recipes

The home screen lists all recipes, newest first. Each card shows the category, name, photo, SJ, carbohydrates, calories and the glycemic index.

- **Search** – type in the search box to find recipes by name, category or ingredient. Case and diacritics are ignored ("ryza" finds "ryža"), and with several words every word must match.
- **Category** – pick a category to see only those recipes.
- **Obľúbené (Favorites)** – shows only your favorite recipes. When signed in, tap the star on a card to add a recipe to favorites or remove it.
- **Filtre (Filters)** – tap to open min–max filters for calories per portion (kcal), SJ per portion, the glycemic index (GI) and the glycemic load (GL), for example 100–250 kcal per portion. Fill in only *od* (from), only *do* (to) or both; the limits are included, decimals work with a comma or a dot ("1,5"), and if *od* is larger than *do* the two are swapped. Calories and SJ per portion are the same values as in the recipe detail (weight of the finished dish / number of servings), rounded the same way (whole kcal, SJ to one decimal), and SJ follow the chosen 1 SJ = 10 g or 12 g. While a filter is set, recipes without that value (for example without servings and weight, or with GI written as text) are hidden. The button shows how many filters are on; **Zrušiť filtre** clears them. Filters combine with the search, the category and favorites.

### Glycemic index colors

The GI label is colored so you can read it at a glance:

| Color | Meaning |
| --- | --- |
| Green | Low GI (55 or less, or text such as "nízky") |
| Amber | Medium GI (56–69) |
| Red | High GI (70 or more, or text such as "vysoký") |

## Recipe detail

Tap a recipe to open it. The detail shows:

- the photo and category,
- the weight of the finished dish and the totals for the whole recipe (calories, proteins, fats, carbohydrates), if they are filled in,
- the nutrition table: calories, proteins, carbohydrates, fats, fiber, salt, SJ, GI and glycemic load (GL),
- the ingredients with amounts,
- the preparation steps,
- notes and tips.

Use **Späť na recepty** to go back to the list, or **Upraviť recept** to edit the recipe. Each recipe has its own link, so you can bookmark it or send it to someone.

### Ingredients for more or fewer servings

Above the ingredients, use **−** and **+** to choose how many servings to cook (1 to 99). The amounts are recalculated from the servings the recipe is written for; a recipe without servings counts as 1. Amounts written as text, such as "podľa chuti", stay as they are. Tap **Pôvodné množstvo** to go back to the amounts in the recipe. The choice only changes what you see; the recipe itself is not changed, and the nutrition values per portion stay the same.

### Values per portion

The **Na jednu porciu** block works out one portion from the values per 100 g: portion weight = weight of the finished dish / number of servings. It shows SJ per portion on its own, and calories, proteins, carbohydrates, fats, fiber and salt per portion below it. Type a weight into **Vlastná porcia (g)** to calculate a different portion; leave it empty to go back to weight / servings. Without servings and weight (or your own portion), the block says what is missing.

SJ are calculated from carbohydrates. Pick **1 SJ = 10 g** (default) or **12 g** of carbohydrates in the block; the choice is remembered on the device. If the SJ you entered per 100 g do not match the carbohydrates, a warning appears in the recipe detail and in the form, and it tells you when the value matches the other factor.

Recipe cards also show **SJ per portion** when servings and weight are filled in.

## Learn what the numbers mean

Tap **📖 Vysvetlivky** in the header (or **Čo je kalorická tabuľka?** / **Čo znamenajú SJ, GI a GL?** in a recipe detail) to open a page that explains, in simple words for kids and beginners:

- the **calorie table** – what kcal, proteins, carbohydrates, fats, fiber and salt are, why values are per 100 g, and how to work out a portion or a whole recipe,
- **SJ** (carbohydrate units) – 1 SJ = 10 g of carbohydrates (or 12 g), and how to count them from a food label,
- the **glycemic index (GI)** – what the 0–100 scale and the colors mean, how GI is measured and what changes it,
- the **glycemic load (GL)** – GL = GI × carbohydrates in the portion ÷ 100, and why portion size matters.

Each topic has a small calculator to try your own numbers. The page also works offline once the app has been opened.

A second tab, **🍽️ Výživný tanier**, shows how to put together a balanced plate (half vegetables and fruit, a quarter protein, a quarter complex carbohydrates, a little healthy fat and water) and lists good sources of carbohydrates and proteins, based on materials from a nutrition coach. It also points out which of these foods still count towards SJ. Both pages work offline once the app has been opened.

## Shopping list

Signed-in family members get a **🛒 Nákupný zoznam** button in the header; the number on it is how many items are still to buy. The list is private: each person sees only their own, on every device where they are signed in. People who are not signed in don't see it.

- **Add an item** – type the name, and optionally the amount and unit (for example *Mlieko*, *2*, *l*), then tap **Pridať**.
- **From a recipe** – in a recipe detail, choose the number of servings above the ingredients and tap **Do nákupného zoznamu**. All ingredients are added in the amounts for those servings, and the recipe is listed under *Z receptov* so you can open it from the list.
- **The same item twice** – if an item with the same name and unit is already on the list, the amounts are added up (200 g + 150 g = 350 g). Amounts written as text or as a range ("podľa chuti", "1–2") stay on their own line. An item you already ticked off comes back unticked.
- **While shopping** – tick an item when it's in the basket; ticked items move to the bottom. **Odstrániť kúpené** removes the ticked ones, and **Vymazať zoznam** (confirm with **Áno, vymazať**) empties the whole list.
- **Done shopping** – tap **Nakúpené – presunúť do histórie**. The list moves to your history (see below) and the next item you add starts a new list.

Every change is saved straight away (*Ukladám…* → *Uložené*), so a connection is needed. If saving fails, the change stays on screen with a message; the next change you make saves everything again. Reloading the page before that drops the unsaved changes.

## History

Signed-in family members get a **História** button (clock icon) in the header. It has two tabs, newest first, and like the shopping list it is private to you:

- **Uvarené jedlá** – tap **Uvarené** in a recipe detail (under the ingredients) to note that you cooked it today, with the number of servings chosen above the ingredients. The history shows the date, the recipe (tap it to open the recipe) and the servings; × removes an entry. The entry keeps the recipe's name even if the recipe is later renamed or deleted.
- **Nákupné zoznamy** – every list you finished with **Nakúpené**, with the date, what was bought (✓) and the recipes it was built from; × removes it.

## Sign in

Everyone can browse recipes. Adding, editing and starring recipes is only for the family:

1. Tap **Prihlásiť sa**, enter your e-mail and tap **Poslať prihlasovací odkaz**.
2. Open the link from the e-mail on the same device. You are signed in and the edit buttons appear.
3. Tap **Odhlásiť sa** to sign out.

Your e-mail must first be added to the family list by the app owner; otherwise no link is sent.

Good to know:

- There is no password. The link works once and expires after about an hour; request a new one if it has expired.
- Only a few sign-in e-mails can be sent per hour (for the whole app). If you see "Bolo odoslaných príliš veľa prihlasovacích odkazov", wait about an hour, or open the newest link you already received.
- Open the link in the same browser where you asked for it. If you installed the app on your home screen, it may keep its own sign-in, separate from the browser.
- You stay signed in on that device until you tap **Odhlásiť sa**; the app renews the sign-in automatically when needed.
- Reading recipes never needs sign-in.

## Add or edit a recipe

Tap **+ Nový recept** to add a recipe, or **Upraviť recept** in a recipe detail to change it. Only the name and the category are required; everything else is optional.

- **Name and category** – you filter by category later, so keep category names consistent (for example always "Polievky").
- **Calorie table (per 100 g)** – calories, carbohydrates, proteins, fats, fiber and salt.
- **Extra values** – number of servings, carbohydrate units (SJ), glycemic index (a number or a word such as "nízky") and glycemic load (GL).
- **Ingredients** – add a row for each ingredient with its name, amount and unit. Remove a row with ×.
- **Preparation steps** – add one step at a time; they are numbered automatically.
- **Notes and tips** and a **photo**: tap **Nahrať fotku** to pick a photo from your phone or computer (it is made smaller and stored with the app's data), or paste the web address of an image.
- **Totals for the whole recipe** – the weight of the finished dish (it depends on how much water evaporates while cooking) and the total calories, proteins, fats and carbohydrates.

Tap **Uložiť recept** (or **Uložiť zmeny** when editing) to save, or **Zrušiť** to leave without saving.

### Main dish and side dish

In the form, **Príloha k tomuto jedlu** links a main dish to another recipe served as its side (for example chicken and gratinated potatoes). The main dish's detail then shows a card for the side dish, and the side dish's detail shows a card for its main dish. Tap a card to open the other recipe; **Back** returns to the first one. Each recipe keeps its own ingredients, values and notes.

### Add a recipe from a link

At the top of **+ Nový recept**, paste the web address of a recipe into **Načítať recept z odkazu** and tap **Načítať recept**. After up to a minute the form is filled in the way the app's recipes are written: in Slovak, with ingredients in g, ks, ČL…, short steps, the nutrition values per 100 g of the finished dish, servings and weight, SJ, GI and GL, the photo from the page, and notes that explain how the values were worked out and end with *Zdroj:* and the link. Many pages have no nutrition table; then the values are worked out from the ingredients, the notes say so, and the app tells you they are an estimate. The photo is the one from the page. Check the values, then tap **Uložiť recept**. Nothing is saved until you do.

If the app says the recipe was taken over as it is on the page (not translated, no values), the full import is not switched on yet; fill in the rest by hand. Only signed-in family members can import.

## Troubleshooting

- **"Recepty sa nepodarilo načítať."** – check your internet connection and tap **Skúsiť znova**.
- **"Recept sa nepodarilo uložiť."** – your changes are still in the form; check the connection and save again.
- **"Prihlasovací odkaz sa nepodarilo odoslať."** – your e-mail is not on the family list yet, or too many links were requested; wait a minute and try again.
- **"Prihlásenie vypršalo."** – sign in again with a new link.
- **"Nákupný zoznam sa nepodarilo načítať."** / **"Zmeny v nákupnom zozname sa nepodarilo uložiť."** – check the connection; tap **Skúsiť znova**, or sign in again if your sign-in has expired.
- **"Recept sa nepodarilo načítať."** – the page could not be opened, it has no recipe, or the import is busy; check the link, try again later, or fill in the form by hand.
- **The app looks out of date** – close it and open it again (sometimes twice); the new version loads in the background.

---

Want to work on the app itself? See [CONTRIBUTING.md](CONTRIBUTING.md).
