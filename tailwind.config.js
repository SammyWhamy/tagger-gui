/* eslint-disable global-require */
module.exports = {
  content: ['./src/renderer/**/*.{js,jsx,ts,tsx,ejs}'],
  mode: 'jit',
  theme: {},
  plugins: [require('daisyui')],
};
