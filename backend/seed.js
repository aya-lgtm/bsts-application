require('dotenv').config();
const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/v1';
let token = '';

const login = async () => {
  const res = await axios.post(`${BASE_URL}/auth/login`, {
    email: 'admin@bsts.ma',
    password: 'Admin1234!',
  });
  token = res.data.accessToken;
  console.log('✅ Connecté en tant qu\'ADMIN');
};

const createLesson = async (data) => {
  const res = await axios.post(`${BASE_URL}/sat/admin/lessons`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log(`✅ Leçon créée : ${data.titre}`);
  return res.data.lesson.id;
};

const createQuiz = async (lessonId, questions) => {
  await axios.post(`${BASE_URL}/sat/admin/lessons/${lessonId}/quiz`, { questions }, {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log(`✅ ${questions.length} question(s) ajoutée(s)`);
};

const seed = async () => {
  await login();

  // ── MATH / INTERMEDIATE — Fonctions et graphiques ──
  const m1 = await createLesson({
    unitId: '5d46e4ac-bdc7-4d5f-bc0f-c68b7b9e7715',
    titre: "Les fonctions linéaires", ordre: 1, type: 'TEXT', dureeMinutes: 10,
    contenu: "## Qu'est-ce qu'une fonction linéaire ?\n\nForme : f(x) = ax + b\n\n- a = pente (slope)\n- b = ordonnée à l'origine (y-intercept)\n\n## Exemple\n\nf(x) = 2x + 3\n- Pente = 2\n- Passe par (0, 3)\n\n## Calculer la pente\n\npente = (y2 - y1) / (x2 - x1)\n\nExemple : Points (1,2) et (3,8) → pente = (8-2)/(3-1) = 3",
  });
  await createQuiz(m1, [
    { enonce: "Dans f(x) = 3x + 5, quelle est la pente ?", choixA: "5", choixB: "3", choixC: "8", choixD: "15", bonneReponse: "B", explication: "Dans f(x) = ax + b, a est la pente. Ici a = 3." },
    { enonce: "Quelle est la pente entre (2,4) et (4,10) ?", choixA: "2", choixB: "3", choixC: "4", choixD: "6", bonneReponse: "B", explication: "pente = (10-4)/(4-2) = 6/2 = 3" },
  ]);

  const m2 = await createLesson({
    unitId: '5d46e4ac-bdc7-4d5f-bc0f-c68b7b9e7715',
    titre: "Les fonctions quadratiques", ordre: 2, type: 'TEXT', dureeMinutes: 12,
    contenu: "## Forme standard\n\nf(x) = ax² + bx + c\n\n## Vertex (sommet)\n\nx = -b/(2a)\n\n## Exemple SAT\n\nf(x) = x² - 4x + 3\n- a=1, b=-4, c=3\n- x du sommet = 4/2 = 2\n- f(2) = 4 - 8 + 3 = -1\n- Sommet : (2, -1)\n\n## Discriminant\n\nΔ = b² - 4ac\n- Δ > 0 : 2 solutions\n- Δ = 0 : 1 solution\n- Δ < 0 : pas de solution réelle",
  });
  await createQuiz(m2, [
    { enonce: "Dans f(x) = 2x² - 3x + 1, quelle est la valeur de f(2) ?", choixA: "1", choixB: "3", choixC: "5", choixD: "7", bonneReponse: "B", explication: "f(2) = 2(4) - 3(2) + 1 = 8 - 6 + 1 = 3" },
    { enonce: "Quel est le sommet de f(x) = x² - 6x + 9 ?", choixA: "(3, 0)", choixB: "(0, 9)", choixC: "(-3, 0)", choixD: "(6, 9)", bonneReponse: "A", explication: "x = -(-6)/(2×1) = 3, f(3) = 9-18+9 = 0. Sommet : (3,0)" },
  ]);

  // ── MATH / INTERMEDIATE — Géométrie fondamentale ──
  const m3 = await createLesson({
    unitId: '38c9a7b9-f3a2-4acc-ad6b-6f0d93e82bdc',
    titre: "Aires et périmètres", ordre: 1, type: 'TEXT', dureeMinutes: 10,
    contenu: "## Formules essentielles\n\n**Rectangle :**\n- Aire = L × l\n- Périmètre = 2(L + l)\n\n**Cercle :**\n- Aire = πr²\n- Circonférence = 2πr\n\n**Triangle :**\n- Aire = (base × hauteur) / 2\n\n## Exemple SAT\n\nUn cercle de rayon 5 → Aire = π(25) ≈ 78.5",
  });
  await createQuiz(m3, [
    { enonce: "Un rectangle de longueur 8 et largeur 3. Quel est son périmètre ?", choixA: "11", choixB: "22", choixC: "24", choixD: "16", bonneReponse: "B", explication: "Périmètre = 2(8+3) = 2×11 = 22" },
    { enonce: "Un cercle de rayon 5. Quelle est son aire ? (π ≈ 3.14)", choixA: "15.7", choixB: "31.4", choixC: "78.5", choixD: "157", bonneReponse: "C", explication: "Aire = π×r² = 3.14×25 = 78.5" },
  ]);

  const m4 = await createLesson({
    unitId: '38c9a7b9-f3a2-4acc-ad6b-6f0d93e82bdc',
    titre: "Triangles et angles", ordre: 2, type: 'TEXT', dureeMinutes: 10,
    contenu: "## Types de triangles\n\n- Rectangle : un angle de 90°\n- Isocèle : 2 côtés égaux\n- Équilatéral : 3 côtés égaux\n\n## Théorème de Pythagore\n\na² + b² = c² (c = hypoténuse)\n\n## Somme des angles\n\nToujours = 180°\n\n## Triplets pythagoriciens courants\n\n3-4-5, 5-12-13, 8-15-17",
  });
  await createQuiz(m4, [
    { enonce: "Dans un triangle rectangle avec cathètes 3 et 4, quelle est l'hypoténuse ?", choixA: "5", choixB: "6", choixC: "7", choixD: "9", bonneReponse: "A", explication: "3² + 4² = 9 + 16 = 25, √25 = 5" },
    { enonce: "Si deux angles d'un triangle sont 60° et 80°, quel est le troisième ?", choixA: "30°", choixB: "40°", choixC: "50°", choixD: "60°", bonneReponse: "B", explication: "180° - 60° - 80° = 40°" },
  ]);

  // ── MATH / ADVANCED — Algèbre avancée ──
  const m5 = await createLesson({
    unitId: 'd8aecdff-47ff-4522-9ef0-551c4af1804f',
    titre: "Systèmes d'équations", ordre: 1, type: 'TEXT', dureeMinutes: 12,
    contenu: "## Méthodes de résolution\n\n**Substitution :**\n1. Isoler une variable\n2. Substituer dans l'autre équation\n\n**Élimination :**\n1. Multiplier pour aligner les coefficients\n2. Additionner ou soustraire les équations\n\n## Exemple\n\n3x - 2y = 10\nx + y = 5\n\nDe la 2e : y = 5-x\nSubstituer : 3x - 2(5-x) = 10 → 5x = 20 → x = 4, y = 1",
  });
  await createQuiz(m5, [
    { enonce: "Si 3x - 2y = 10 et x + y = 5, quelle est la valeur de x ?", choixA: "2", choixB: "3", choixC: "4", choixD: "5", bonneReponse: "C", explication: "Par substitution : y = 5-x → 3x-2(5-x)=10 → 5x=20 → x=4" },
    { enonce: "Si x + y = 8 et x - y = 2, quelle est la valeur de x ?", choixA: "3", choixB: "4", choixC: "5", choixD: "6", bonneReponse: "C", explication: "Addition : 2x = 10 → x = 5" },
  ]);

  const m6 = await createLesson({
    unitId: 'd8aecdff-47ff-4522-9ef0-551c4af1804f',
    titre: "Polynômes et factorisation", ordre: 2, type: 'TEXT', dureeMinutes: 12,
    contenu: "## Factorisation\n\n**Différence de carrés :**\na² - b² = (a+b)(a-b)\n\n**Trinôme :**\nx² + bx + c = (x+p)(x+q)\noù p×q = c et p+q = b\n\n## Exemples SAT\n\nx² - 9 = (x+3)(x-3)\nx² + 5x + 6 = (x+2)(x+3)\n\n## Simplification\n\n(x²-9)/(x-3) = x+3 (pour x≠3)",
  });
  await createQuiz(m6, [
    { enonce: "Simplifie (x² - 9) / (x - 3)", choixA: "x - 3", choixB: "x + 3", choixC: "x² + 3", choixD: "3 - x", bonneReponse: "B", explication: "x²-9 = (x-3)(x+3), donc (x²-9)/(x-3) = x+3" },
    { enonce: "Factorise x² + 7x + 12", choixA: "(x+3)(x+4)", choixB: "(x+2)(x+6)", choixC: "(x+1)(x+12)", choixD: "(x+4)(x+3)", bonneReponse: "A", explication: "3×4=12 et 3+4=7, donc (x+3)(x+4)" },
  ]);

  // ── MATH / EXPERT — Trigonométrie ──
  const m7 = await createLesson({
    unitId: '5232cfed-428f-45d3-a706-5bb0f9a11233',
    titre: "Sin, Cos, Tan", ordre: 1, type: 'TEXT', dureeMinutes: 15,
    contenu: "## Définitions (SOH-CAH-TOA)\n\n- Sin(θ) = Opposé / Hypoténuse\n- Cos(θ) = Adjacent / Hypoténuse\n- Tan(θ) = Opposé / Adjacent\n\n## Identité fondamentale\n\nsin²(θ) + cos²(θ) = 1\n\n## Valeurs clés\n\n- sin(30°) = 1/2, cos(30°) = √3/2\n- sin(45°) = cos(45°) = √2/2\n- sin(60°) = √3/2, cos(60°) = 1/2\n- sin(90°) = 1, cos(90°) = 0",
  });
  await createQuiz(m7, [
    { enonce: "Si sin(θ) = 3/5, quelle est cos(θ) ?", choixA: "3/4", choixB: "4/5", choixC: "4/3", choixD: "5/3", bonneReponse: "B", explication: "sin²+cos²=1 → 9/25+cos²=1 → cos²=16/25 → cos=4/5" },
    { enonce: "Dans un triangle rectangle, sin(30°) = ?", choixA: "√3/2", choixB: "1/2", choixC: "1", choixD: "√2/2", bonneReponse: "B", explication: "sin(30°) = 1/2, c'est une valeur à mémoriser." },
  ]);

  // ── READING / INTERMEDIATE — Analyse littéraire ──
  const r1 = await createLesson({
    unitId: '054abec2-dcb5-4e8b-b26a-b4fbbde71117',
    titre: "Dispositifs rhétoriques", ordre: 1, type: 'TEXT', dureeMinutes: 12,
    contenu: "## Les figures de style essentielles\n\n**Métaphore :** comparaison sans 'comme'\n- Ex: 'La vie est un voyage'\n\n**Personnification :** donner des traits humains à un objet\n- Ex: 'Le vent hurle'\n\n**Allitération :** répétition de sons\n- Ex: 'Peter Piper picked'\n\n**Ironie :** dire le contraire de ce qu'on pense\n\n## Au SAT\n\nOn te demande souvent d'identifier le but rhétorique d'un passage.",
  });
  await createQuiz(r1, [
    { enonce: "'Le vent hurlait dans la nuit.' Quel dispositif est utilisé ?", choixA: "Métaphore", choixB: "Allitération", choixC: "Personnification", choixD: "Oxymore", bonneReponse: "C", explication: "Attribuer 'hurler' au vent est une personnification." },
    { enonce: "Dans une argumentation, attaquer la personne et non ses arguments s'appelle :", choixA: "Analogie", choixB: "Ad hominem", choixC: "Syllogisme", choixD: "Euphémisme", bonneReponse: "B", explication: "Ad hominem = attaque personnelle plutôt que logique." },
  ]);

  // ── READING / ADVANCED — Textes scientifiques ──
  const r2 = await createLesson({
    unitId: '89d97219-4fc3-4364-9817-65a754662f07',
    titre: "Analyser des données scientifiques", ordre: 1, type: 'TEXT', dureeMinutes: 12,
    contenu: "## Types de questions scientifiques au SAT\n\n1. **Interpréter un graphique** → Lis les axes d'abord\n2. **Corrélation vs Causalité** → Corrélation ≠ cause\n3. **Hypothèse vs Conclusion** → Une hypothèse est testable\n4. **Limites d'une étude** → Taille de l'échantillon, biais\n\n## Méthode\n\n1. Lis le titre et les axes\n2. Identifie la tendance générale\n3. Cherche les exceptions\n4. Ne sur-interprète pas",
  });
  await createQuiz(r2, [
    { enonce: "Si une étude montre que manger du chocolat et être heureux sont liés, cela prouve :", choixA: "Le chocolat cause le bonheur", choixB: "Le bonheur cause l'envie de chocolat", choixC: "Une corrélation, pas une causalité", choixD: "Rien de significatif", bonneReponse: "C", explication: "Corrélation ≠ causalité. D'autres facteurs peuvent expliquer la relation." },
    { enonce: "Une hypothèse scientifique doit être :", choixA: "Vraie", choixB: "Testable", choixC: "Prouvée", choixD: "Complexe", bonneReponse: "B", explication: "Une hypothèse doit être testable et réfutable pour être scientifique." },
  ]);

  // ── WRITING / INTERMEDIATE — Style et clarté ──
  const w1 = await createLesson({
    unitId: 'aaf6da8c-1b1f-4572-b722-b5f9429a7895',
    titre: "Concision et clarté", ordre: 1, type: 'TEXT', dureeMinutes: 10,
    contenu: "## Principes de concision\n\nLe SAT préfère les phrases courtes et claires.\n\n## Erreurs fréquentes\n\n**Redondance :** 'completely finished' → 'finished'\n**Wordy :** 'due to the fact that' → 'because'\n**Passive inutile :** 'The ball was kicked by John' → 'John kicked the ball'\n\n## Test simple\n\nSi tu peux supprimer un mot sans changer le sens → supprime-le.",
  });
  await createQuiz(w1, [
    { enonce: "Quelle phrase est la plus concise ?", choixA: "Due to the fact that it rained, we stayed home.", choixB: "Because it rained, we stayed home.", choixC: "On account of the rain, we decided to stay at home.", choixD: "The rain caused us to make the decision to stay home.", bonneReponse: "B", explication: "'Because' est plus concis que 'Due to the fact that'." },
    { enonce: "Quel mot est redondant dans 'completely finished' ?", choixA: "completely", choixB: "finished", choixC: "Les deux", choixD: "Aucun", bonneReponse: "A", explication: "'Finished' implique déjà la complétude. 'Completely' est redondant." },
  ]);

  // ── WRITING / ADVANCED — Rhétorique et argumentation ──
  const w2 = await createLesson({
    unitId: 'b5b66e4c-c0e9-4045-a255-f30eb9506178',
    titre: "Structure d'un essai SAT", ordre: 1, type: 'TEXT', dureeMinutes: 15,
    contenu: "## Structure standard\n\n1. **Introduction** → Hook + contexte + thèse\n2. **Corps 1** → Argument + preuve + analyse\n3. **Corps 2** → Argument + preuve + analyse\n4. **Conclusion** → Synthèse + ouverture\n\n## La thèse parfaite\n\nDoit être :\n- Spécifique (pas vague)\n- Arguable (pas un fait)\n- Soutenue par des preuves\n\n## Transitions efficaces\n\nFurthermore, However, In contrast, As a result, Nevertheless",
  });
  await createQuiz(w2, [
    { enonce: "Quelle transition exprime une opposition ?", choixA: "Furthermore", choixB: "However", choixC: "Therefore", choixD: "Similarly", bonneReponse: "B", explication: "'However' exprime une opposition ou contraste." },
    { enonce: "Une bonne thèse doit être :", choixA: "Un fait indiscutable", choixB: "Très générale", choixC: "Spécifique et arguable", choixD: "Une question", bonneReponse: "C", explication: "Une thèse doit être spécifique et défendable avec des preuves." },
  ]);

  // ── MATH / BEGINNER — Arithmétique et nombres ──
  const m8 = await createLesson({
    unitId: 'b4ca3809-a2f8-4ff6-8329-0c4607a00cc6',
    titre: "Fractions et pourcentages", ordre: 1, type: 'TEXT', dureeMinutes: 10,
    contenu: "## Fractions\n\n- Simplifier : diviser numérateur et dénominateur par le PGCD\n- Multiplier : numérateur × numérateur / dénominateur × dénominateur\n- Diviser : multiplier par l'inverse\n\n## Pourcentages\n\n- x% de N = (x/100) × N\n- Augmentation de x% : N × (1 + x/100)\n- Réduction de x% : N × (1 - x/100)\n\n## Exemple SAT\n\n30% de 150 = 0.3 × 150 = 45",
  });
  await createQuiz(m8, [
    { enonce: "Quel est 25% de 80 ?", choixA: "15", choixB: "20", choixC: "25", choixD: "40", bonneReponse: "B", explication: "25% de 80 = 0.25 × 80 = 20" },
    { enonce: "Un prix de 200$ est réduit de 15%. Quel est le nouveau prix ?", choixA: "160$", choixB: "170$", choixC: "180$", choixD: "185$", bonneReponse: "B", explication: "200 × (1 - 0.15) = 200 × 0.85 = 170$" },
  ]);

  console.log('\n🎉 Seed complet ! Toutes les unités ont des leçons et questions.');
};

seed().catch(console.error);