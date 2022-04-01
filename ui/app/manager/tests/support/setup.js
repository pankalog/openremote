const { setWorldConstructor, BeforeAll, AfterAll, After, Before } = require("@cucumber/cucumber");
const { ChromiumBroswer } = require("playwright");
const playwright = require('playwright');
const fs = require('fs');
require('dotenv').config();

/**
 * command for running all the test
 *         yarn test
 * 
 * command for running certain test/tests with the "tag"(@OpenRemote) 
 *         yarn run tags "tag" (yarn run tags "@OpenRemote")
 * 
 * command for viewing the reports
 *         yarn run report
 * 
 * command for more.....
 */

var global = {
    browser: ChromiumBroswer
}

class CustomWorld {

    async navigate(realm, user) {
        var context
        if (fs.existsSync('storageState.json')) {
            context = await global.browser.newContext({
                storageState: 'storageState.json',
            });
            this.page = await context.newPage();
            if (realm == "admin")
                await this.page.goto(process.env.LOCAL_URL);
            else
                await this.page.goto(process.env.SMARTCITY_URL)
        }
        else {
            context = await global.browser.newContext();
            this.page = await context.newPage();
            if (realm == "admin")
                await this.page.goto(process.env.LOCAL_URL);
            else
                await this.page.goto(process.env.SMARTCITY_URL)
            this.login(user)
        }
    }


    async login(user) {
        if (user == "admin") {
            await this.page?.fill('#username', process.env.USER_LOCAL_ID)
            await this.page?.fill('#password', process.env.LOCAL_PASSWORD)
        }
        else {
            await this.page?.fill('#username', process.env.SMARTCITY)
            await this.page?.fill('#password', process.env.SMARTCITY)
        }

        await this.page?.keyboard.press('Enter');
        await this.page?.context().storageState({ path: 'storageState.json' });
    }


    async click(button) {
        await this.page?.locator(button).click()
    }


    async logout() {
        if (fs.existsSync('storageState.json')) {
            fs.unlinkSync('storageState.json')
        }
    }

}

// launch broswer
BeforeAll(async function () {
    global.browser = await playwright.chromium.launch({
        headless: false,
        slowMo: 500
    });
})


// close page
After(async function () {
    await this.page.close()
})


// close browser and delete authentication file
AfterAll(async function () {
    await global.browser.close()
    if (fs.existsSync('storageState.json')) {
        fs.unlinkSync('storageState.json')
    }
})

setWorldConstructor(CustomWorld);
