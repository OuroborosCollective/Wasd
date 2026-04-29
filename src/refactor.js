const { parseDocument, isMap, isSeq } = require('yaml');

/**
 * Refactors GitHub Action YAML files to remove the 'version' property 
 * from 'pnpm/action-setup' steps while preserving comments.
 * 
 * @param {string} filePath - The path of the processed file.
 * @param {string} content - The YAML file content.
 * @returns {Object} Result object containing filePath and the deleted version string.
 */
function refactorPnpmAction(filePath, content) {
    const doc = parseDocument(content);
    let deletedVersion = null;

    if (!doc.contents || !doc.has('jobs')) {
        return {
            filePath,
            deletedVersion: null,
            content: doc.toString()
        };
    }

    const jobs = doc.get('jobs');
    if (isMap(jobs)) {
        jobs.items.forEach((jobPair) => {
            const job = jobPair.value;
            if (isMap(job)) {
                const steps = job.get('steps');
                if (isSeq(steps)) {
                    steps.items.forEach((step) => {
                        if (isMap(step)) {
                            const uses = step.get('uses');
                            if (typeof uses === 'string' && uses.startsWith('pnpm/action-setup')) {
                                const withBlock = step.get('with');
                                if (isMap(withBlock) && withBlock.has('version')) {
                                    // Capture the old version value for the return object
                                    const versionNode = withBlock.get('version');
                                    deletedVersion = versionNode ? versionNode.toString() : null;

                                    // AST Manipulation: Delete the version attribute
                                    withBlock.delete('version');

                                    // Optional: If 'with' block is now empty, remove it entirely
                                    if (withBlock.items.length === 0) {
                                        step.delete('with');
                                    }
                                }
                            }
                        }
                    });
                }
            }
        });
    }

    return {
        filePath,
        deletedVersion,
        content: doc.toString()
    };
}

module.exports = { refactorPnpmAction };