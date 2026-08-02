(async () => {
    try {
        const { ensureAdmin } = require('./src/ensure-admin');
        await ensureAdmin();
        console.log('DONE');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
})();
