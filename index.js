/*
    Создать приложение для ВКонтакте, которое загружает список ваших друзей и выводит их на страницу в следующем формате:
    Фото, ФИО, Возраст, Дата рождения.
    Друзья должны быть отсортированы по дате рождения в порядке убывания. То есть на самом верху списка расположен друг с
    ближайший датой рождения.
    Использование шаблонизатора приветствуется.
    */

new Promise(resolve => {
    if (document.readyState === 'complete') {
        resolve();
    } else {
        window.onload = resolve;
    }
}).then(() => {
    return new Promise((resolve, reject) => {
        Handlebars.registerHelper('bdate', (bdate) => {
            if (!bdate) {
                return '';
            }

            let [date, month, year] = bdate.split('.');
            date = Number.parseInt(date) < 10 ? `0${date}` : date;
            month = Number.parseInt(date) < 10 ? `.0${month}` : `.${month}`;
            year =  year ? `.${year}` : '';
            let template = `<p>${date}${month}${year}</p>`;

            if (year) {
                const age = new Date().getFullYear() - Number.parseInt(year.slice(1));
                template = `${template}<p>${age}</p>`;
            }

            return new Handlebars.SafeString(template);
        })

        VK.init({
            apiId: '7882489'
        });

        VK.Auth.login(function(response) {
            console.log(response);
            if (response.status === "connected") {
                resolve(response);
            } else {
                reject(new Error('Не удалось авторизоваться'));
            }
        }, 8);
    })
}).then(() => {
    return new Promise((resolve, reject) => {
        VK.api('users.get', {
                name_case: 'nom',
                v: '5.131',
                fields: 'photo_100'},
            result => {
                console.log('user', {result});
                if (result.error || !result?.response) {
                    reject(new Error('Что-то пошло не так с запросом users'));
                } else {
                    const {response} = result;
                    const title = document.querySelector('.title');
                    title.innerText = `Привет ${response[0].first_name} ${response[0].last_name}`;
                    resolve();
                }
            })
    })
}).then(() => {
    return new Promise((resolve, reject) => {
        VK.api('friends.get', {
                v: '5.131',
                fields: 'photo_100, bdate'
            },
            result => {
                console.log('friends', {result})
                if (result?.response?.items?.length) {
                    const {response} = result;

                    const {withOutBDate, withBDate, rawWithOutYear} = response.items.reduce((acc, el) => {
                        if (!el.bdate) {
                            acc.withOutBDate.push(el);
                        } else {
                            const [,, y] = el.bdate.split('.');

                            if (y) {
                                el.sortedDate = el.bdate;
                                acc.withBDate.push(el);
                            } else {
                                const year = new Date().getFullYear();
                                el.sortedDate = `${el.bdate}.${year}`;
                                acc.rawWithOutYear.push(el);
                            }
                        }

                        return acc;
                    }, {
                        withOutBDate: [],
                        withBDate: [],
                        rawWithOutYear: []
                    });

                    const sortDates = (a, b) => {
                        let [aDate, aMonth, aYear] = a.sortedDate.split('.');
                        let [bDate, bMonth, bYear] = b.sortedDate.split('.');
                        aMonth = aMonth - 1;
                        bMonth = bMonth - 1;

                        const aNewDate = new Date(aYear, aMonth, aDate).getTime();
                        const bNewDate = new Date(bYear, bMonth, bDate).getTime();

                        return bNewDate - aNewDate;
                    }

                    const sortedFriendsList = withBDate.sort(sortDates);
                    const sortWithOutYear = rawWithOutYear.sort(sortDates);

                    const filteredFriendsList = [...sortedFriendsList, ...sortWithOutYear, withOutBDate];

                    resolve(filteredFriendsList);
                } else {
                    reject(new Error('Что-то пошло не так с запросом friends'));
                }
            })
    })
}).then(friends => {
    const friendsBlock = document.querySelector('.friends-block');
    const source = document.querySelector('#friends-template').innerHTML;
    const friendsTemplate = Handlebars.compile(source);
    friendsBlock.innerHTML = friendsTemplate({friends: friends});
}).catch(e => {
    alert(e.message);
})