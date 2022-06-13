let seconds = 0;
setInterval(async () => {
    seconds++;
    if(seconds == 40){
        console.error('Не было совершенно действий в течение 40 секунд. Обновление страницы');
        await timeout(2000);
        openLink(window.location.href);
    }
}, 1000);
class functionsClass {
    version = 3;
    queryArgsString = '';
    backendApi = '';
    backendApiMsg = '';
    clickFromScript = false;

    updates = {
        '05.03.2022': [
            '- Разработка началась',
        ]
    };

    elementCreatedInerations = 0;
    elementCreatedStatus = true;
    isAuth= false;

    constructor() {
        for(let r in queryArgs){
            this.queryArgsString += `&${r}=${queryArgs[r]}`;
        }
        this.queryArgsString += `&version=${this.version}`
    
        if(domain == ''){
            domain = 'a.unirenter.ru';
        }
    
        this.backendApi = `https://${domain}/b24/api/avito.php?do=avitoSendMsg${this.queryArgsString}`;
        this.backendApiMsg = `https://${domain}/b24/api/avito.php?do=avitoSendAnswer${this.queryArgsString}`;
            
        console.log(`VERSION: ${this.version}`);
        for(let i in this.updates){
            console.info(`Обновление от ${i}\n`, this.updates[i].join("\n"));
        }

        // Обновляется ли URL
        window.addEventListener('locationchange', () => {
            readMessages();
        });
        (() => {
            let oldPushState = history.pushState;
            history.pushState = function pushState() {
                let ret = oldPushState.apply(this, arguments);
                window.dispatchEvent(new Event('pushstate'));
                window.dispatchEvent(new Event('locationchange'));
                return ret;
            };
    
            let oldReplaceState = history.replaceState;
            history.replaceState = function replaceState() {
                let ret = oldReplaceState.apply(this, arguments);
                window.dispatchEvent(new Event('replacestate'));
                window.dispatchEvent(new Event('locationchange'));
                return ret;
            };
    
            window.addEventListener('popstate', () => {
                window.dispatchEvent(new Event('locationchange'));
            });
        })();
    }

    //пусть тайм-аут работает на промисе, чтобы не плодить километровую вложенность
    timeout(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async elementCreated(element) {
        this.elementCreatedStatus = false;
        if(!$(element).length){
            let ret = this.addElementCreatedInerations(element);
            if(ret == 'error'){
                return;
            }
            await this.timeout(1000);
            this.elementCreated(element);
        }
        this.elementCreatedStatus = true;
        return $(element);
    }

    async ajax(url, data = {}){
        const settings = {
            method: 'POST',
            body: JSON.stringify(data)
        };

        try {
            url = url.indexOf('version') != -1 ? url : url + this.queryArgsString;
            let fetchResponse = await fetch(url, settings);
            if(fetchResponse.status !== 200){
                throw new Error(`Статус ответа: ${fetchResponse.status}`);
            }

            let data = await fetchResponse.json();

            return data;
        } catch (e) {
            alert(e);
            console.error('Произошла ошибка в GET запросе. Возможно включен CORS');
            console.error(e);
        }
    }

    //Оборачиваем fetch в свою функцию, чтобы сделать исключения
    async get(url){
        try {
            let response = await fetch(url + this.queryArgsString);
            if(response.status !== 200){
                throw new Error(`Статус ответа: ${response.status}`);
            }
            let data = await response.json();

            return data;
        } catch (e) {
            alert(e);
            console.error('Произошла ошибка в GET запросе. Возможно включен CORS');
            console.error(e);
        }
    }

    async error(error, avitoId = false){
        if(!avitoId){
            let r = JSON.parse(localStorage.getItem('avitoMessengerData'));
            avitoId = r.avitoID;
        }

        let res = await this.ajax(this.backendApi, {avitoId: avitoId, statusCode: error});
        this.getItem(res);
    }

    //Для получения частей урл /
    getUrl(part, url = false) {
        let path;
        if(url){
            path = url;
        }else{
            path = window.location.pathname;
        }
        
        let parts = path.split('/');

        if (!parts[part]) {
            return false;
        }

        return parts[part];
    }

    //для получения get параметров
    getQuery(name, url = window.location.href) {
        if(url.indexOf('?') == -1 && url.indexOf('&') != -1){
            url = url.replace('&', '?');
            window.location.href = url;
        }
        name = name.replace(/[\[\]]/g, '\\$&');
        var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
            results = regex.exec(url);
        if (!results) return null;
        if (!results[2]) return '';
        return decodeURIComponent(results[2].replace(/\+/g, ' '));
    }

    addElementCreatedInerations(element){
        this.elementCreatedInerations++;
        if(this.elementCreatedInerations == 10){
            this.elementCreatedStatus = false;
            console.error(`Элемент ${element} не был загружен за 10 секунд`);
            return 'error';
        }
    }
};