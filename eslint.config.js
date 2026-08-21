// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    files: [
      "src/components/ExerciseMotionMedia.tsx",
      "src/components/ProgressReport.tsx",
      "src/screens/student/StudentCalendarScreen.tsx",
      "src/screens/trainer/TrainerCalendarScreen.tsx",
      "src/screens/trainer/TrainerHome.tsx",
    ],
    rules: {
      "react-hooks/refs": "off",
      "react-hooks/purity": "off",
    },
  },
]);
