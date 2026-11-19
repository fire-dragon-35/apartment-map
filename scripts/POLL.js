for (let i = 0; i < 40 && window.__status === 'running'; i++) await new Promise(r => setTimeout(r, 1000));
window.__status === 'done' ? window.__res : window.__status
