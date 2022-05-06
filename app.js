$(document).ready(function() { 
    menu();
});

//bug fix
$('body').on('submit', '.channel-bottom-base-form-1xsja', e => e.preventDefault());

$('body').on('click', 'a[data-marker="channels/channelLink"]', readMessagesFromMinichat);

let msgs = [];

async function menu() {
    //Это таймаут для проверки наличия элемента
    //У авито используются разные классы на разных страницах, поэтому будем заниматься гаданием на кофейной гуще
    console.log('Проверяем загрузку меню');
    let element = await elementCreated('.index-add-button-wrapper-s0SLe, .header-button-wrapper-2UC-r');

    if (elementCreatedStatus !== true) {
        console.error('Не удалось найти элементы меню');
        return;
    }

    console.log('Проверка наличия меню');

    let divClasses = element.attr('class');
    let aClasses = element.find('a').attr('class');

    let started = localStorage.getItem('started');
    if(started == null || started == 'false'){
        if(getUrl(2) == 'messenger'){
            readMessages();
        }
        started = false;
    }else{
        started = true;
        
        if(getUrl(1) && getUrl(2) != 'messenger'){
            parse();
        }else if(!getUrl(1)){
            getItem();
        }
    }

    //Добавляем кнопки управления.
    element.after(`
        ${started === false
        ? `<div class="${divClasses}"><a href="#" id="messenger-start" class="${aClasses}" style="background:red;">Отправить</a></div>`
        : `<div class="${divClasses}"><a href="#" id="messenger-stop" class="${aClasses}" style="background:red;">Остановить</a></div>`}
    `);

    if($('[data-marker="header/menu-profile"]').length || $('[data-marker="header/username-button"]').length){
        isAuth = true;
    }

    $('body').on('click', 'a#messenger-start', start);
    $('body').on('click', 'a#messenger-stop', stop);
}

async function start(){
    if(isAuth === false){
        alert('Вы должно авторизоваться');
        console.error('Вы не авторизованы');

        return;
    }
    localStorage.setItem('started', true);

    getItem();
}
async function stop(){
    localStorage.setItem('started', false);

    window.location.reload();
}

async function getItem(args = {}){
    let item = {};

    if(Object.keys(args) == 0){
        item = await get(backendApi);
    }else{
        item = args;
    }

    if(Object.keys(item) == 0){
        console.error('Ошибка получения данных с сервера #1');
        return;
    }

    if(!item.results){
        console.error('Ошибка получения данных с сервера #2');
        return;
    }

    if(!item.results.avitoLink){
        console.error('Ошибка получения данных с сервера #3');
        return;
    }

    if(!item.results.avitoLink.result){
        console.error('Ошибка получения данных с сервера #4');
        return;
    }

    console.log('Получены данные с API сервера');

    item = item.results.avitoLink.result[0];
    console.table(item);

    localStorage.setItem('avitoMessengerData', JSON.stringify(item));
    console.log('Данные сохранены в локальное хранилище');

    console.log('Ожидание 3 секунды, затем переход в карточку товара');
    await timeout(3000);
    window.location.href = item.avitoUrl;
}

async function parse(args = {}){
    let avitoItem = JSON.parse(localStorage.getItem('avitoMessengerData'));
    
    let announcementId = await elementCreated('[data-marker="item-view/item-id"]');
    if(elementCreatedStatus !== true){
        console.error('Не удалось найти ID объявления');
        return;
    }
    announcementId = announcementId.text().replace('№', '').trim();

    if(avitoItem.avitoID != announcementId){
        console.error('ID не совпадает с полученым по API');
        if (!debug) {
            error('noProductCard');
        }
        return;
    }

    if(!args.skip){
        console.log('Страница с товаром загружена. Ожидаем 5 секунд, затем проверяем кнопку');

        await timeout(5000);

        if(!$('.js-messenger-button').length){
            console.error('Кнопка сообщений не найдена');
            error('noSendButtong');
            return;
        }
        if(!$('[data-marker="messenger-button/button"]').length){
            console.error('Кнопка сообщений не найдена');
            error('noSendButtong');
            return;
        }
        console.log('Кнопка сообщений найдена. Выжидаем 15 секунд');
        await timeout(15000);
    }else{
        console.log('Функция отправки сообщения запущена второй раз. Ожидаем 5 секунд и пытаемся повторно кликнуть');
        await timeout(5000);
    }
    
    clickFromScript = true;
    $('[data-marker="messenger-button/button"]').click();
    clickFromScript = false;

    console.log('Кнопка нажата. Ждём 2 секунды до полного открытия. Затем проверяем, тому ли человеку пишет');
    await timeout(2000);

    if(!$('[data-marker="header/authorName"]').length){
        console.error('Мини чат не был открыт.');
        if(!args.skip){
            console.log('Пробуем загрузить ещё раз');
            parse({skip: true});
            return;
        }else{
            console.error('Повторный запуск не помог. Уход в ошибку');
            //todo
            return;
        }
    }

    let userNameInMessenger = $('[data-marker="header/authorName"]').text().trim();
    let userNameInPage = $('.seller-info-name a').text().trim();
    if(!userNameInPage){
        userNameInPage = $('.seller-info-name').text().trim();
    }
    console.log(userNameInMessenger, userNameInPage);
    if(userNameInMessenger != userNameInPage){
        console.error('Имя открытого диалога не совпадает с объявлением');
        return;
    }

    console.log('Имя открытого диалога совпадает с объявлением. Начинаем писать.');

    sendMessage(avitoItem.msg);
}

//рекурсия - плохо, но будет рекурсия
async function sendMessage(msg = [], i = 0){
    if(!msg.length){
        return false;
    }

    console.log(`Ввод текста: %c ${msg[i]}`, 'color: green');
    
    const textarea = document.querySelector('[data-marker="reply/input"]');
    textarea.focus();

    for(let iteration = 0; iteration <= msg[i].length; iteration++){
        let word = msg[i][iteration];
        if(!word) continue;

        let appendText = `${$('[data-marker="reply/input"]').text()}${word}`;
        // $('[data-marker="reply/input"]').text(appendText).val(appendText);
        document.execCommand('insertText', false, word); //vscode метит execCommand как устаревшую, но нам норм
        await timeout(Math.floor(Math.random() * 400) + 2);
    }    
    textarea.dispatchEvent(new Event('change', {bubbles: true}));

    await timeout(1000);

    if(!$('.channel-bottom-base-sendButtonElement-2Y0Jd').length){
        console.error('Кнопка отправки сообщения не найдена');
        return;
    }

    if($('.channel-bottom-base-sendButtonElement-2Y0Jd').hasClass('channel-bottom-base-sendButton_disabled-ZQ-vl')){
        console.error('Кнопка отправки недоступна');
        return;
    }

    $('.channel-bottom-base-sendButtonElement-2Y0Jd').click();
    msgs[i] = 1;
    console.log('Сообщение отправили. Ждём тайм-аут и проверяем');

    await timeout(5000);

    //Проверка сообщения
    //Если там иконка ошибки, которая обычно возникает из-за номера телефона, то кликаем на переотправку
    $('.messages-history-scrollContent-p3n_S .message-text-design_new-3q1tp').each(async (index, item) => {
        let text = $(item).text().trim();
        if(text != msg[i]){
            return;
        }
        let element = $(item).closest('.message-base-content-3uH8y');
        if(element.find('[aria-label="Отправить снова"]').length){
            console.log('Сообщение найдено, но в нём ошибка. Кликаем на переотправку');
            element.find('[aria-label="Отправить снова"]').click();
            msgs[i] = 2;
        }

        await timeout(2000);
    });

    i++;
    if(msg[i]){
        console.log('Пишем следующее сообщение');
        sendMessage(msg, i);
    }else{
        console.log('Все сообщения отправлены. Проверяем их');
        sendMessageComplete(msg);
    }
}

//Финальная проверка отправки сообщений
async function sendMessageComplete(msg){
    let result = {msgStatus: {}};

    $('.messages-history-scrollContent-p3n_S .message-text-design_new-3q1tp').each(async (index, item) => {
        let text = $(item).text().trim();
        
        let messageIndex = msg.findIndex(value => value == text);

        let element = $(item).closest('.message-base-content-3uH8y');
        if(element.find('[aria-label="Отправить снова"]').length){
            console.error(`Сообщение "${msg[messageIndex]}" не было отправлено. Обновляем страницу`);
            result[`msgStatus`][messageIndex] = 'sendError';
            return;
        }else{
            result[`msgStatus`][messageIndex] = `send${msgs[messageIndex]}`;
        }
    });

    console.log('Все сообщения отправлены. Можно переходить к отправке по API');

    let localItem = JSON.parse(localStorage.getItem('avitoMessengerData'));
    let messengerID = $('[data-marker="mini-messenger/messenger-page-link"]').attr('href').replace('https://www.avito.ru', '');
    result['messengerID']   = getUrl(4, messengerID);
    result['avitoID']       = localItem['avitoID'];
    result['id']            = localItem['id'];

    console.table(result);

    let data = await ajax(backendApi, result);
    console.log(`%c Всё готово, идём дальше`, 'color: green');
    getItem(data);
}

async function readMessages(){
    if(getUrl(3) != 'channel' && !getUrl(4)){
        return;
    }

    console.log('Читаем сообщения');
    let messengerID = getUrl(4);
    console.log(`ID диалога: ${messengerID}`);

    await timeout(5000);

    let messages = [];

    $('.messages-history-scrollContent-JCA7b')
        .find('.message-base-root-U74PL')
        .each((index, item) => {
            let text = $(item).find('.message-text-design_new-BfC1m').text();
            if(!text){
                return;
            }
            messages.push(text);
        });

    console.log('Все сообщения собраны');
    console.log(messages.join("\n"));

    ajax(backendApiMsg, {messengerID: messengerID, messages: messages});
}

async function readMessagesFromMinichat(){
    if(getUrl(3) == 'channel' && getUrl(4)){
        return;
    }
    await timeout(3000);
    console.log('Читаем сообщения');
    let messengerID = getUrl(4, $('[data-marker="mini-messenger/messenger-page-link"]').attr('href').replace('https://www.avito.ru', ''));
    console.log(`ID диалога: ${messengerID}`);

    await timeout(2000);

    let messages = [];

    $('div[data-marker="messagesHistory/list"] div[data-marker="message"]').each(async (index, item) => {
        let text = $(item).find('[data-marker="messageText"]').text();
        if(!text){
            return;
        }
        messages.push(text);
    });

    console.log('Все сообщения собраны');
    console.log(messages.join("\n"));

    ajax(backendApiMsg, {messengerID: messengerID, messages: messages});
}