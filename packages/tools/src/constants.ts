export const NAME = 'template';

if (!process.env.PROJECT_CWD) {
    throw new Error('Please update the usage of `process.env.PROJECT_CWD`.');
}
export const ROOT = process.env.PROJECT_CWD!;

export const MD_TOC_KEY = '<!-- #toc -->';
export const MD_TOC_OMIT_KEY = '<!-- #omit in toc -->';
