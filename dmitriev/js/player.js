document.addEventListener('DOMContentLoaded', () => {
    // --- Элементы DOM ---
    const player = document.getElementById('player');
    const playPauseIcon = document.getElementById('play-pause-icon');
    const togglePlayButton = document.getElementById('toggle-play-button');
    const progressIndicator = document.getElementById('progress-indicator');
    const nameElement = document.querySelector('.v1_12');
    const trackTitleElement = document.querySelector('.v2001_12');
    const albumCoverElement = document.querySelector('.album-cover');
    const pauseBar1 = document.querySelector('#play-pause-icon .v1_32');
    const pauseBar2 = document.querySelector('#play-pause-icon .v1_33');
    const prevButton = document.querySelector('.icon-prev');
    const nextButton = document.querySelector('.icon-next');
    const avatarElement = document.querySelector('.v1_46');
    const discordIconContainer = document.querySelector('.v2001_2');

    // --- Состояние плеера ---
    let playlist = [];
    let currentTrackIndex = 0;
    let startTime = 0;
    let endTime = 0;
    let shouldAutoPlay = false;

    // 🚨 ДОБАВЛЕНО/ИЗМЕНЕНО: Переменная для Discord ID
    let discordID = 'c0n1cal'; // Дефолтное значение

    // --- Вспомогательные функции ---

    /** Преобразует время "MM:SS" в секунды. */
    function timeToSeconds(timeStr) {
        if (timeStr === 'start' || timeStr === 'end') return timeStr;
        const parts = timeStr.split(':').map(Number);
        if (parts.length === 2) {
            return parts[0] * 60 + parts[1];
        }
        return 0;
    }

    /** Устанавливает текущий трек в плеере. */
    function loadTrack(index, autoPlay = false) {
        if (index < 0 || index >= playlist.length) {
            console.error("Неверный индекс трека.");
            return;
        }

        shouldAutoPlay = autoPlay;

        currentTrackIndex = index;
        const track = playlist[currentTrackIndex];

        // 1. Обновляем UI и параметры
        player.src = track.videoPath;
        albumCoverElement.style.backgroundImage = `url("${track.coverPath}")`;
        trackTitleElement.textContent = track.title;

        startTime = timeToSeconds(track.start);
        endTime = timeToSeconds(track.end);

        // 2. Запускаем загрузку и принудительную паузу, чтобы успеть установить currentTime
        player.load();
        player.pause();
        updatePlayPauseIcon();
    }

    // --- Логика управления плеером ---

    function togglePlayPause() {
        if (player.paused) {
            shouldAutoPlay = true;
            player.play().catch(error => {
                console.error("Воспроизведение было заблокировано:", error);
                shouldAutoPlay = false;
            });
        } else {
            player.pause();
            shouldAutoPlay = false;
        }
        updatePlayPauseIcon();
    }

    function nextTrack() {
        const autoPlay = !player.paused;
        let nextIndex = (currentTrackIndex + 1) % playlist.length;
        loadTrack(nextIndex, autoPlay);
    }

    function prevTrack() {
        const autoPlay = !player.paused;
        let prevIndex = (currentTrackIndex - 1 + playlist.length) % playlist.length;
        loadTrack(prevIndex, autoPlay);
    }

    function updatePlayPauseIcon() {
        if (!player.paused) {
            // PAUSE
            playPauseIcon.style.justifyContent = 'space-between';
            pauseBar1.style.width = '12px';
            pauseBar1.style.transform = 'none';
            pauseBar2.style.display = 'block';
        } else {
            // PLAY
            playPauseIcon.style.justifyContent = 'center';
            pauseBar1.style.width = '40px';
            pauseBar1.style.transform = 'skewX(20deg)';
            pauseBar2.style.display = 'none';
        }
    }

    // --- Обработчики прогресса и времени ---

    player.addEventListener('timeupdate', () => {
        if (!player.duration) return;

        let trackEnd = endTime === 'end' ? player.duration : endTime;
        let trackStart = startTime === 'start' ? 0 : startTime;

        // Контроль завершения отрезка
        if (player.currentTime >= trackEnd && trackEnd > 0) {
            nextTrack();
            return;
        }

        // Вычисление прогресса в пределах отрезка (start до end)
        const duration = trackEnd - trackStart;
        if (duration <= 0) return;

        const relativeTime = player.currentTime - trackStart;
        const percent = (relativeTime / duration) * 100;
        progressIndicator.style.width = `${Math.min(100, percent)}%`;
    });

    /** Гарантируем установку времени до воспроизведения. */
    player.addEventListener('canplay', () => {
        let trackStart = startTime === 'start' ? 0 : startTime;

        // 1. Устанавливаем время начала
        if (Math.abs(player.currentTime - trackStart) > 0.1) {
            player.currentTime = trackStart;
        }

        // 2. Определяем фактическое время конца
        if (endTime === 'end' || endTime === 0) {
            endTime = player.duration;
        }

        // 3. Запускаем, только если должен быть автозапуск
        if (shouldAutoPlay) {
            player.play().catch(error => {
                console.error("Автовоспроизведение заблокировано:", error);
            });
            shouldAutoPlay = false;
        }

        updatePlayPauseIcon();
    });

    /** Перемотка при первом запуске (после клика пользователя). */
    player.addEventListener('play', () => {
        let trackStart = startTime === 'start' ? 0 : startTime;
        // Если плеер начал играть, но находится не в нужной точке, перемещаем его
        if (Math.abs(player.currentTime - trackStart) > 0.1) {
            player.currentTime = trackStart;
        }
    });

    // --- Загрузка настроек ---

    async function loadSettings() {
        try {
            const response = await fetch('settings/settings.txt');
            if (!response.ok) throw new Error(`Ошибка загрузки: ${response.statusText}`);

            const settingsObject = await response.json();

            playlist = settingsObject.tracks || [];
            nameElement.textContent = settingsObject.profile.name || "Unknown User";

            // 🚨 ИЗМЕНЕНО: Считывание Discord ID из settings.txt
            discordID = settingsObject.profile.discord || 'c0n1cal';

            // ЛОГИКА ДЛЯ АВАТАРА (Используем дефолтный путь, если в settings.txt пусто)
            const defaultAvatarPath = "images/avatar.jpg";
            let avatarPath = settingsObject.profile.avatarPath;

            if (!avatarPath || avatarPath.trim() === '') {
                avatarPath = defaultAvatarPath;
            }

            if (avatarElement) {
                avatarElement.style.backgroundImage = `url("${avatarPath}")`;
            }

            // --- Загрузка первого трека ---
            if (playlist.length > 0) {
                loadTrack(0, false);
            } else {
                console.warn("Плейлист пуст.");
            }

        } catch (error) {
            console.error("Не удалось загрузить или разобрать файл настроек:", error);
        }
    }

    // --- Инициализация ---

    togglePlayButton.addEventListener('click', togglePlayPause);
    playPauseIcon.addEventListener('click', togglePlayPause);
    prevButton.addEventListener('click', prevTrack);
    nextButton.addEventListener('click', nextTrack);

    // 🚨 ИЗМЕНЕНО: Использование переменной discordID
    if (discordIconContainer) {
        discordIconContainer.addEventListener('click', () => {
            // Используем значение, считанное из settings.txt (или дефолтное)
            const textToCopy = discordID;

            navigator.clipboard.writeText(textToCopy).then(() => {
                console.log(`Текст "${textToCopy}" скопирован в буфер обмена!`);
            }).catch(err => {
                console.error('Не удалось скопировать текст:', err);
                prompt('Скопируйте вручную:', textToCopy);
            });
        });
    }

    loadSettings();
    updatePlayPauseIcon();
});