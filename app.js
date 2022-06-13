$(document).ready(function() { 
    menu();
});

//bug fix
$('body').on('submit', '.channel-bottom-base-form-1xsja', e => e.preventDefault());

$('body').on('click', 'a[data-marker="channels/channelLink"]', readMessagesFromMinichat);

let msgs = [];

let functions;

async function menu() {
    functions = new functionsClass();

    //Это таймаут для проверки наличия элемента
    //У авито используются разные классы на разных страницах, поэтому будем заниматься гаданием на кофейной гуще
    console.log('Проверяем загрузку меню');
    let element = await functions.elementCreated('.index-add-button-wrapper-s0SLe, .header-button-wrapper-2UC-r');

    if (functions.elementCreatedStatus !== true) {
        console.error('Не удалось найти элементы меню');
        return;
    }

    console.log('Проверка наличия меню');

    let divClasses = element.attr('class');
    let aClasses = element.find('a').attr('class');

    let started = localStorage.getItem('startedMsgSender');
    if(started == null || started == 'false'){
        if(functions.getUrl(2) == 'messenger'){
            readMessages();
        }
        started = false;
    }else{
        started = true;
        
        if(functions.getUrl(1) && functions.getUrl(2) != 'messenger'){
            parse();
        }else if(functions.getUrl(2) == 'messenger' && functions.getUrl(4)) {
            await functions.timeout(3000);
            let message = JSON.parse(localStorage.getItem('avitoMessengerData'));
            if(message.avitoChatID != functions.getUrl(4)) {
                console.error('Открытый чат не совпадает с ИД из локального хранилища');
                return;
            }

            sendMessage(message.msg);
        }else if(!functions.getUrl(1)){
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
    localStorage.setItem('startedMsgSender', true);

    getItem();
}
async function stop(){
    localStorage.setItem('startedMsgSender', false);

    window.location.reload();
}

async function getItem(args = {}){
    let item = {};

    if(Object.keys(args) == 0){
        item = await functions.get(functions.backendApi);
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

    if(!item.results.avitoSendMsg){
        console.error('Ошибка получения данных с сервера #3');
        return;
    }

    if(!item.results.avitoSendMsg.result){
        console.error('Ошибка получения данных с сервера #4');
        return;
    }

    console.log('Получены данные с API сервера');

    if(item.results.avitoSendMsg.stat){
        let text = $('#messenger-start').text();
        $('#messenger-start').text(`${text}. ${item.results.avitoSendMsg.stat.numSend}/${item.results.avitoSendMsg.stat.numDone}`);

        localStorage.setItem('numSend', item.results.avitoSendMsg.stat.numSend);
        localStorage.setItem('numDone', item.results.avitoSendMsg.stat.numDone);
    }

    item = item.results.avitoSendMsg.result[0];
    console.table(item);

    localStorage.setItem('avitoMessengerData', JSON.stringify(item));
    console.log('Данные сохранены в локальное хранилище');

    console.log('Ожидание 3 секунды, затем переход в карточку товара');
    await functions.timeout(3000);

    if(item.avitoUrl){
        window.location.href = item.avitoUrl;
    } else if (item.avitoChatID) {
        window.location.href = 'https://www.avito.ru/profile/messenger/channel/' + item.avitoChatID;
    }
}

async function parse(args = {}){
    let avitoItem = JSON.parse(localStorage.getItem('avitoMessengerData'));
    
    if(localStorage.getItem('numSend') != null && localStorage.getItem('numSend') != ''){
        await functions.timeout(1000);
        let text = $('#messenger-stop').text();
        $('#messenger-stop').text(`${text}. ${localStorage.getItem('numSend')}/${localStorage.getItem('numDone')}`);

    }

    let announcementId = await functions.elementCreated('[data-marker="item-view/item-id"]');
    if(functions.elementCreatedStatus !== true){
        console.error('Не удалось найти ID объявления');
        return;
    }
    announcementId = announcementId.text().replace('№', '').replace(',', '').trim();

    if(avitoItem.avitoID != announcementId){
        console.error('ID не совпадает с полученым по API');
        if (!debug) {
            error('noProductCard');
        }
        return;
    }

    if(!args.skip){
        console.log('Страница с товаром загружена. Ожидаем 5 секунд, затем проверяем кнопку');

        await functions.timeout(5000);

        if(!$('[data-marker="messenger-button/button"]').length){
            console.error('Кнопка сообщений не найдена');
            functions.error('noSendButtong');
            return;
        }
        console.log('Кнопка сообщений найдена. Выжидаем 15 секунд');
        await functions.timeout(15000);
    }else{
        console.log('Функция отправки сообщения запущена второй раз. Ожидаем 5 секунд и пытаемся повторно кликнуть');
        await functions.timeout(5000);
    }
    
    clickFromScript = true;
    $('[data-marker="messenger-button/button"]:eq(0)').click();
    $('[data-marker="messenger-button/button"]:eq(1)').click();
    clickFromScript = false;

    console.log('Кнопка нажата. Ждём 2 секунды до полного открытия. Затем проверяем, тому ли человеку пишет');
    await functions.timeout(2000);

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
    let userNameInPage = $('[data-marker="header/authorName"]').text().trim();

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
        await functions.timeout(Math.floor(Math.random() * 400) + 2);
    }    
    textarea.dispatchEvent(new Event('change', {bubbles: true}));

    await functions.timeout(1000);

    if(!$('[data-marker="reply/send"]').length){
        console.error('Кнопка отправки сообщения не найдена');
        return;
    }

    if($('[data-marker="reply/send"]').hasClass('channel-bottom-base-sendButton_disabled-ZQ-vl')){
        console.error('Кнопка отправки недоступна');
        return;
    }

    $('[data-marker="reply/send"]').click();
    msgs[i] = 1;
    console.log('Сообщение отправили. Ждём тайм-аут и проверяем');

    await functions.timeout(5000);

    //Проверка сообщения
    //Если там иконка ошибки, которая обычно возникает из-за номера телефона, то кликаем на переотправку
    $('[data-marker="messagesHistory/list"] [data-marker="message"]').each(async (index, item) => {
        let text = $(item).text().trim();

        if(text != msg[i].trim()){
            return;
        }
        // let element = $(item).closest('.message-base-content-3uH8y');
        // if(element.find('[aria-label="Отправить снова"]').length){
        //     console.log('Сообщение найдено, но в нём ошибка. Кликаем на переотправку');
        //     element.find('[aria-label="Отправить снова"]').click();
        //     msgs[i] = 2;
        // }
        let element = $(item).find('[data-marker="message/error"]');

        if(element.length){
            console.log('Сообщение найдено, но в нём ошибка. Кликаем на переотправку');
            element.click();
            msgs[i] = 2;
        }

        await functions.timeout(2000);
    });

    i++;
    if(msg[i]){
        console.log('Пишем следующее сообщение');
        sendMessage(msg, i);
    }else{
        await functions.timeout(2000);
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

    let messengerID;
    let findChatID = $('[data-marker="mini-messenger/messenger-page-link"]');
    if(findChatID.length) {
        messengerID = findChatID.attr('href').replace('https://www.avito.ru', '');
    }else{
        messengerID = functions.getUrl(4);
    }
    result['messengerID']   = functions.getUrl(4, messengerID);
    result['avitoID']       = localItem['avitoID'];
    result['id']            = localItem['id'];

    console.table(result);

    let data = await functions.ajax(functions.backendApi, result);
    console.log(`%c Всё готово, идём дальше`, 'color: green');
    getItem(data);
}

async function readMessages(){
    if(functions.getUrl(3) != 'channel' && !functions.getUrl(4)){
        return;
    }

    console.log('Читаем сообщения');
    let messengerID = functions.getUrl(4);
    console.log(`ID диалога: ${messengerID}`);

    await functions.timeout(5000);

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

    functions.ajax(functions.backendApiMsg, {messengerID: messengerID, messages: messages});
}

async function readMessagesFromMinichat(){
    if(functions.getUrl(3) == 'channel' && functions.getUrl(4)){
        readMessages()
        return;
    }
    await functions.timeout(3000);
    console.log('Читаем сообщения');
    let messengerID = functions.getUrl(4, $('[data-marker="mini-messenger/messenger-page-link"]').attr('href').replace('https://www.avito.ru', ''));
    console.log(`ID диалога: ${messengerID}`);

    await functions.timeout(2000);

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

    functions.ajax(functions.backendApiMsg, {messengerID: messengerID, messages: messages});
}
async function openLink(url) {
    // window.location.href = url;
    window.open(url);
    await(500);
    window.close();
}

//Слушаем события происходящие на странице. Если открывается диалог - передаём информацию на сервер
$('body').on('click', '[data-marker="channels/channelLink"]', async e => {
    await functions.timeout(1000);
    
    let chatId = functions.getUrl(4);
});