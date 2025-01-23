window.addEventListener('load', () => {
    let progress = 0;
    const preloader = document.getElementById('preloader');
    const mainContent = document.getElementById('main-content');
    const loadingText = document.querySelector('.loading-text');

    // Функция для обновления прогресса загрузки
    function updateProgress() {
        if (progress < 100) {
            progress++;
            loadingText.textContent = `Загрузка... ${progress}%`;
            setTimeout(updateProgress, 20);  // Частота обновления (20 мс)
        } else {
            // Завершаем анимацию прелоадера
            setTimeout(() => {
                // Плавное исчезновение
                preloader.style.opacity = '0'; // Начинаем плавное исчезновение
                preloader.style.transition = 'opacity 1s ease'; // Задаем плавный переход

                // После завершения анимации прелоадера показываем основной контент
                setTimeout(() => {
                    preloader.style.display = 'none';  // Полностью скрываем прелоадер
                }, 1000);  // Задержка для завершения анимации исчезновения (1 секунда)
            }, 500); // Задержка перед началом анимации исчезновения
        }
    }

    updateProgress();
});