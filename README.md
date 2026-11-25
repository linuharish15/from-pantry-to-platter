# IngreDine: your smart kitchen assistant

**Use what you have. Discover recipes. Cook happier.**

IngreDine turns the ingredients in your kitchen, or the name of any dish in the world, into dishes and step-by-step recipes. AI calls run on the server through Lovable AI, so model credentials never reach browser code.

## What the app does

- **Three separate sections**
  - **Use my ingredients**: add what you have and get three dish ideas.
  - **Make a specific dish**: name any dish, dessert, snack or drink and get the full recipe. You can optionally list what you already have, so missing ingredients are worked out for you.
  - **Kitchen Consultation**: a chat with Chef for cooking doubts. Short kitchen facts sit under the title, and the send button is **Ask Chef**.
- **Tap a dish name to see how to make it.** Every dish the AI lists opens its own recipe. Steps stay hidden until you choose a dish.
- **Steps written in the 7 Cs**: Clear, Concise, Concrete, Correct, Complete, Coherent, Courteous. Each step also shows how long it takes and what to look for to know it is done.
- **Readable typography**: the recipe name is the largest text (serif), step titles use a rounded heading face, step text uses an easy body face, and Chef's replies use a larger reading size with separate styles for safety notes and follow-ups.
- **Number of people**: type any number from 1 to 100. Ingredient quantities are scaled by the AI to match. If you change the number after seeing a recipe, an **Update** button re-scales it.
- **Recipe details**: preparation time, cooking time, total time, difficulty, required, available and missing ingredients, equipment, substitutions and an approximate cost in your chosen currency.
- **Suggestions while typing** for ingredients and dishes (about 150 ingredients and 140 dishes, including South Indian dishes, desserts and snacks).
- **Cuisine preference** sits directly under the ingredient or dish box, with search and groups for regional cuisines, diets, and dish types. **All Worldwide Cuisines** is the final option and includes every cuisine.
- **Photo, camera and voice** under the ingredient box, the dish box and the Chef chat: upload a photo, use the live camera, or speak. Voice uses the browser's speech recognition in the chosen recipe language.
- **Login and chat history**: email and password sign-in. Recipe searches and Chef conversations are saved in a history panel and can be re-opened or deleted. History is stored in this browser, separately for each signed-in account.
- **Theme**: a cream, leaf-green and carrot-orange palette taken from the logo, with a hand-drawn vegetable and dessert pattern background (`public/food-pattern.svg`).

AI-generated quantities, costs and cooking guidance are suggestions. Please follow food-safety guidance for your ingredients and equipment.

## Development

Requires Node.js and npm (or Bun).

```sh
git clone https://github.com/linuharish15/from-pantry-to-platter.git
cd from-pantry-to-platter
npm install
npm run dev
```

Checks:

```sh
npm test
npm run lint
npm run build
```

Recipe, photo and consultation generation need `LOVABLE_API_KEY` in the deployment's secret configuration. Never commit secret values. Sign-in uses the configured Supabase auth client.

## Project layout

- `src/routes/index.tsx`: page, sections and state
- `src/components/`: `FoodInputs` (ingredient, dish, cuisine and options), `RecipeResults`, `KitchenConsultation`, `AuthAccount`, `HistoryPanel`, `MediaButtons`, `CameraDialog`
- `src/lib/recipes/`: AI prompts and schemas (`recipes.server.ts`, `consultation.server.ts`), request validation, and shared option lists (`options.ts`)
- `src/lib/`: `voice.ts`, `food-photo.ts`, `history.ts`, `auth.ts`
- `src/assets/ingredine-logo.jpg`, `public/logo-mark.png`: logo files

This project is connected to [Lovable](https://lovable.dev). Changes pushed to the connected branch sync with the Lovable editor.
