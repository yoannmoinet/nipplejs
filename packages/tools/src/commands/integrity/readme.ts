import { MD_TOC_KEY, MD_TOC_OMIT_KEY, ROOT } from '@nipple/tools/constants';
import { green, replaceInBetween, slugify } from '@nipple/tools/helpers';
import fs from 'fs';
import { glob } from 'glob';

// Matches image tags individually with surrounding whitespaces.
const IMG_RX = /[\s]*<img.+?(?=\/>)\/>[\s]*/g;

const getReadmeToc = (readmeContent: string) => {
    // Remove all the code blocks to avoid collisions.
    const cleanContent = readmeContent.replace(/```([\s\S](?!```))*[\s\S]```/gm, '');
    // Get all titles.
    const titles = cleanContent.match(/^#{1,3} (.*)/gm) || [];
    // Remove ignored titles.
    let biggestTitle = 3;
    const titlesToUse = titles
        .filter((title) => !title.includes(MD_TOC_OMIT_KEY))
        .map((title) => {
            const [level, ...restOfTitle] = title.split(' ');

            // Save biggest title.
            if (level.length < biggestTitle) {
                biggestTitle = level.length;
            }

            // Also remove any pictures from the title.
            const finalTitle = restOfTitle.join(' ');
            // Image tags are replaced by "-" in GitHub's READMEs.
            const slug = slugify(finalTitle.replace(IMG_RX, '-'));

            return {
                // Remove the image tags.
                name: finalTitle.replace(IMG_RX, ''),
                slug,
                level: level.length,
            };
        });

    const toc = titlesToUse
        .map((title) => {
            const { name, slug, level } = title;
            const indent = ' '.repeat((level - biggestTitle) * 4);
            return `${indent}-   [${name}](#${slug})`;
        })
        .join('\n');

    return toc;
};

export const injectTocsInAllReadmes = () => {
    // Get all the readmes of the repository.
    const readmes = glob
        .sync(`${ROOT}/**/*.md`)
        // Filter out node_modules
        .filter((file) => !file.includes('node_modules'));

    // Inject the Table of content in all of them.
    for (const readmePath of readmes) {
        const readmeContent = fs.readFileSync(readmePath, 'utf-8');

        if (!readmeContent.includes(MD_TOC_KEY)) {
            continue;
        }

        const readmeToc = getReadmeToc(readmeContent);

        console.log(`  Inject ${green('TOC')} in ${green(readmePath)}.`);
        fs.writeFileSync(readmePath, replaceInBetween(readmeContent, MD_TOC_KEY, readmeToc));
    }
};
