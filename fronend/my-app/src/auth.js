// Central auth constants/util for protected actions
export const WAHAB_USERNAME = 'wahab';
export const WAHAB_PASSWORD = 'wahab123';

export const verifyWahabPassword = (pwd) => String(pwd) === WAHAB_PASSWORD;