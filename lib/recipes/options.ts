// Shared option lists. Imported by both the browser UI and the server-side request validation,
// so a cuisine shown in the picker is always accepted by the server.

export const WORLDWIDE_CUISINE = "All Worldwide Cuisines" as const;

export const cuisineGroups = [
  {
    label: "Regional cuisines",
    options: [
      "South Indian", "North Indian", "Indian", "Chettinad", "Kerala", "Bengali", "Gujarati", "Punjabi", "Hyderabadi",
      "Sri Lankan", "Pakistani", "Nepalese", "Chinese", "Indo-Chinese", "Japanese", "Korean", "Thai", "Vietnamese",
      "Malaysian", "Singaporean", "Indonesian", "Filipino", "Taiwanese", "Southeast Asian",
      "Italian", "French", "Spanish", "Portuguese", "Greek", "German", "British", "Irish", "Nordic", "Polish", "Russian", "Eastern European", "Mediterranean",
      "Middle Eastern", "Lebanese", "Turkish", "Persian", "Israeli", "Moroccan", "Egyptian", "Ethiopian", "West African", "African",
      "Mexican", "Tex-Mex", "American", "Cajun & Creole", "Caribbean", "Cuban", "Peruvian", "Brazilian", "Argentinian", "Hawaiian", "Australian", "Fusion",
    ],
  },
  {
    label: "Diet & health",
    options: [
      "Vegetarian", "Vegan", "Jain", "Eggless", "Halal", "Kosher", "Gluten-free", "Dairy-free", "Nut-free",
      "Keto", "Low-carb", "High-protein", "Diabetic-friendly", "Low-calorie", "Kid-friendly",
    ],
  },
  {
    label: "Type of dish",
    options: [
      "Breakfast", "Quick meals", "One-pot meals", "Soups & stews", "Salads", "Street food", "Snacks", "Appetizers", "Side dishes",
      "Rice & noodles", "Breads & baking", "Desserts", "Sweets & mithai", "Ice cream & frozen", "Beverages", "Sauces & chutneys",
      "Pickles & preserves", "Seafood", "BBQ & grilling", "Festival specials",
    ],
  },
] as const;

// "All Worldwide Cuisines" is intentionally the last option: it means every cuisine is allowed.
export const cuisineOptions: readonly string[] = [
  ...cuisineGroups.flatMap((group) => [...group.options] as string[]),
  WORLDWIDE_CUISINE,
];

export const currencyOptions = [
  { code: "INR", label: "₹ Indian rupee" },
  { code: "USD", label: "$ US dollar" },
  { code: "EUR", label: "€ Euro" },
  { code: "GBP", label: "£ British pound" },
  { code: "AED", label: "AED Dirham" },
  { code: "SGD", label: "S$ Singapore dollar" },
  { code: "AUD", label: "A$ Australian dollar" },
  { code: "CAD", label: "C$ Canadian dollar" },
] as const;

export type CurrencyCode = (typeof currencyOptions)[number]["code"];
export const currencyCodes = currencyOptions.map((option) => option.code) as [CurrencyCode, ...CurrencyCode[]];

export const languageOptions = [
  { label: "English", value: "English" }, { label: "தமிழ் (Tamil)", value: "Tamil" },
  { label: "हिन्दी (Hindi)", value: "Hindi" }, { label: "മലയാളം (Malayalam)", value: "Malayalam" },
  { label: "తెలుగు (Telugu)", value: "Telugu" }, { label: "ಕನ್ನಡ (Kannada)", value: "Kannada" },
  { label: "বাংলা (Bengali)", value: "Bengali" }, { label: "मराठी (Marathi)", value: "Marathi" },
  { label: "اردو (Urdu)", value: "Urdu" }, { label: "Español", value: "Spanish" },
  { label: "Français", value: "French" }, { label: "Deutsch", value: "German" },
  { label: "Italiano", value: "Italian" }, { label: "Português", value: "Portuguese" },
  { label: "日本語", value: "Japanese" }, { label: "한국어", value: "Korean" },
  { label: "中文", value: "Mandarin Chinese" }, { label: "العربية", value: "Arabic" },
  { label: "Bahasa Indonesia", value: "Indonesian" }, { label: "Tiếng Việt", value: "Vietnamese" },
  { label: "ไทย", value: "Thai" }, { label: "Türkçe", value: "Turkish" },
  { label: "Русский", value: "Russian" }, { label: "Nederlands", value: "Dutch" },
  { label: "Ελληνικά", value: "Greek" }, { label: "Kiswahili", value: "Swahili" },
  { label: "Polski", value: "Polish" }, { label: "Українська", value: "Ukrainian" },
  { label: "فارسی", value: "Persian" },
] as const;

export const speechLocales: Record<string, string> = {
  English: "en-IN", Tamil: "ta-IN", Hindi: "hi-IN", Malayalam: "ml-IN", Telugu: "te-IN", Kannada: "kn-IN",
  Bengali: "bn-IN", Marathi: "mr-IN", Urdu: "ur-PK", Spanish: "es-ES", French: "fr-FR", German: "de-DE",
  Italian: "it-IT", Portuguese: "pt-BR", Japanese: "ja-JP", Korean: "ko-KR", "Mandarin Chinese": "zh-CN",
  Arabic: "ar-SA", Indonesian: "id-ID", Vietnamese: "vi-VN", Thai: "th-TH", Turkish: "tr-TR",
  Russian: "ru-RU", Dutch: "nl-NL", Greek: "el-GR", Swahili: "sw-KE", Polish: "pl-PL",
  Ukrainian: "uk-UA", Persian: "fa-IR",
};

export const ingredientSuggestions = [
  // vegetables
  "Tomato", "Onion", "Red onion", "Shallots", "Potato", "Sweet potato", "Garlic", "Ginger", "Green chilli", "Carrot", "Beetroot", "Radish",
  "Cabbage", "Cauliflower", "Broccoli", "Spinach", "Kale", "Lettuce", "Cucumber", "Zucchini", "Brinjal (eggplant)", "Okra (ladies finger)",
  "Capsicum (bell pepper)", "Green peas", "Green beans", "Corn", "Pumpkin", "Bottle gourd", "Ridge gourd", "Bitter gourd", "Drumstick",
  "Raw banana", "Raw mango", "Mushroom", "Spring onion", "Celery", "Leeks", "Asparagus", "Avocado", "Plantain", "Yam (senai kizhangu)",
  // fruit
  "Lemon", "Lime", "Orange", "Apple", "Banana", "Mango", "Pineapple", "Strawberry", "Blueberry", "Grapes", "Coconut", "Dates", "Papaya", "Pomegranate",
  // protein
  "Chicken", "Chicken breast", "Mutton", "Lamb", "Beef", "Pork", "Egg", "Prawns", "Fish", "Salmon", "Tuna", "Paneer", "Tofu", "Tempeh",
  // dairy
  "Milk", "Curd (yogurt)", "Butter", "Ghee", "Cream", "Cheese", "Mozzarella", "Condensed milk", "Buttermilk",
  // grains & pulses
  "Rice", "Basmati rice", "Idli rice", "Poha", "Rava (semolina)", "Wheat flour (atta)", "All-purpose flour (maida)", "Rice flour", "Ragi flour", "Besan (gram flour)",
  "Oats", "Pasta", "Noodles", "Bread", "Vermicelli", "Toor dal", "Moong dal", "Urad dal", "Chana dal", "Masoor dal", "Chickpeas", "Rajma (kidney beans)", "Black beans", "Lentils",
  // pantry & sweeteners
  "Sugar", "Jaggery", "Honey", "Maple syrup", "Chocolate", "Cocoa powder", "Baking powder", "Baking soda", "Yeast", "Vanilla extract", "Cornflour", "Peanut butter",
  // oils, sauces
  "Oil", "Coconut oil", "Olive oil", "Sesame oil", "Soy sauce", "Vinegar", "Tomato ketchup", "Tamarind", "Coconut milk", "Peanuts", "Cashews", "Almonds", "Raisins",
  // spices & herbs
  "Salt", "Black pepper", "Turmeric", "Red chilli powder", "Coriander powder", "Cumin seeds", "Mustard seeds", "Fennel seeds", "Garam masala", "Sambar powder",
  "Cardamom", "Cinnamon", "Cloves", "Bay leaf", "Curry leaves", "Coriander leaves", "Mint", "Basil", "Parsley", "Oregano", "Thyme", "Saffron", "Asafoetida (hing)",
];

export const dishSuggestions = [
  // South Indian
  "Idli", "Dosa", "Masala dosa", "Medu vada", "Sambar", "Rasam", "Pongal", "Upma", "Chettinad chicken curry", "Lemon rice", "Curd rice", "Tamarind rice (puliyodharai)",
  "Kothu parotta", "Appam with stew", "Avial", "Kerala fish curry", "Bisi bele bath", "Filter coffee", "Payasam", "Mysore pak", "Kesari", "Adhirasam",
  // North Indian & general Indian
  "Chicken biryani", "Vegetable biryani", "Hyderabadi dum biryani", "Butter chicken", "Paneer butter masala", "Palak paneer", "Dal makhani", "Chole bhature", "Rajma chawal",
  "Aloo paratha", "Vegetable pulao", "Egg curry", "Fish fry", "Samosa", "Pav bhaji", "Pani puri", "Vada pav", "Dhokla", "Poha", "Gulab jamun", "Rasmalai", "Jalebi", "Gajar halwa", "Kheer", "Mango lassi", "Masala chai",
  // Asian
  "Veg fried rice", "Chicken fried rice", "Hakka noodles", "Gobi Manchurian", "Chilli chicken", "Chicken momos", "Vegetable dumplings", "Pad Thai", "Thai green curry", "Tom yum soup",
  "Sushi rolls", "Miso soup", "Ramen", "Chicken katsu", "Bibimbap", "Kimchi fried rice", "Pho", "Banh mi", "Nasi goreng", "Laksa", "Chicken adobo", "Mochi",
  // European / American
  "Creamy tomato pasta", "Spaghetti carbonara", "Lasagna", "Margherita pizza", "Risotto", "Tiramisu", "Panna cotta", "Ratatouille", "Crepes", "Croissants", "French onion soup", "Paella", "Gazpacho", "Churros",
  "Greek salad", "Moussaka", "Cheeseburger", "Mac and cheese", "Pancakes", "Banana pancakes", "French toast", "Caesar salad", "Grilled cheese sandwich", "Fish and chips", "Shepherd's pie", "Beef stew",
  // Middle East / Africa / Americas
  "Falafel", "Hummus", "Shakshuka", "Shawarma", "Kunafa", "Baklava", "Tabbouleh", "Jollof rice", "Tagine", "Injera with doro wat", "Tacos al pastor", "Chicken enchiladas", "Guacamole", "Quesadilla", "Ceviche", "Feijoada",
  // Desserts, bakes, drinks, snacks
  "Chocolate cake", "Vanilla cupcakes", "Brownies", "Cheesecake", "Apple pie", "Chocolate chip cookies", "Banana bread", "Ice cream", "Chocolate mousse", "Rice pudding", "Fruit salad", "Milkshake", "Lemonade", "Cold coffee",
  "Lentil soup", "Tomato soup", "Sweet corn soup", "French fries", "Onion bhaji", "Peanut sundal", "Popcorn", "Garlic bread", "Veg sandwich", "Chicken nuggets", "Coconut chutney", "Mint chutney", "Mango pickle",
];

export const tips = [
  "Let cooked rice rest, covered, for 5 to 10 minutes so the grains finish steaming.",
  "Poultry is safe to eat when its thickest part reaches 74 °C (165 °F).",
  "Chill cooked food within 2 hours so it stays safe to eat the next day.",
  "Salt pasta water generously: about 10 g of salt per litre.",
  "Taste before the final seasoning. Add salt a little at a time.",
] as const;

export const consultationStarters = [
  "What can I use instead of eggs in a cake?",
  "How do I know when biryani rice is cooked?",
  "My curry is too spicy. How do I fix it?",
  "How long can I keep cooked rice in the fridge?",
];
