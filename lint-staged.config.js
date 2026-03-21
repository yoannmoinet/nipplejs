module.exports = {
    '*.{ts,tsx}': (filenames) => [
        'yarn typecheck',
        `eslint ${filenames.join(' ')} --quiet --fix`,
        'git add',
    ],
    '*.{js,mjs}': (filenames) => [`eslint ${filenames.join(' ')} --quiet --fix`, 'git add'],
    relative: 'true',
};
