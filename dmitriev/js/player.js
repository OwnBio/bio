document.addEventListener('DOMContentLoaded', () => {
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

    let playlist = [];
    let currentTrackIndex = 0;
    let startTime = 0;
    let endTime = 0;
    let shouldAutoPlay = false;
    let discordID = 'none';

    function timeToSeconds(timeStr) {
        if (timeStr === 'start' || timeStr === 'end') return timeStr;
        const parts = timeStr.split(':').map(Number);
        if (parts.length === 2) {
            return parts[0] * 60 + parts[1];
        }
        return 0;
    }

    function loadTrack(index, autoPlay = false) {
        if (index < 0 || index >= playlist.length) {
            console.error("Неверный индекс трека.");
            return;
        }

        shouldAutoPlay = autoPlay;

        currentTrackIndex = index;
        const track = playlist[currentTrackIndex];

        player.src = track.videoPath;
        albumCoverElement.style.backgroundImage = `url("${track.coverPath}")`;
        trackTitleElement.textContent = track.title;

        startTime = timeToSeconds(track.start);
        endTime = timeToSeconds(track.end);

        player.load();
        player.pause();
        updatePlayPauseIcon();
    }


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
            playPauseIcon.style.justifyContent = 'space-between';
            pauseBar1.style.width = '12px';
            pauseBar1.style.transform = 'none';
            pauseBar2.style.display = 'block';
        } else {
            playPauseIcon.style.justifyContent = 'center';
            pauseBar1.style.width = '40px';
            pauseBar1.style.transform = 'skewX(20deg)';
            pauseBar2.style.display = 'none';
        }
    }


    player.addEventListener('timeupdate', () => {
        if (!player.duration) return;

        let trackEnd = endTime === 'end' ? player.duration : endTime;
        let trackStart = startTime === 'start' ? 0 : startTime;

        if (player.currentTime >= trackEnd && trackEnd > 0) {
            nextTrack();
            return;
        }

        const duration = trackEnd - trackStart;
        if (duration <= 0) return;

        const relativeTime = player.currentTime - trackStart;
        const percent = (relativeTime / duration) * 100;
        progressIndicator.style.width = `${Math.min(100, percent)}%`;
    });

    player.addEventListener('canplay', () => {
        let trackStart = startTime === 'start' ? 0 : startTime;

        if (Math.abs(player.currentTime - trackStart) > 0.1) {
            player.currentTime = trackStart;
        }

        if (endTime === 'end' || endTime === 0) {
            endTime = player.duration;
        }

        if (shouldAutoPlay) {
            player.play().catch(error => {
                console.error("Автовоспроизведение заблокировано:", error);
            });
            shouldAutoPlay = false;
        }

        updatePlayPauseIcon();
    });

    player.addEventListener('play', () => {
        let trackStart = startTime === 'start' ? 0 : startTime;
        if (Math.abs(player.currentTime - trackStart) > 0.1) {
            player.currentTime = trackStart;
        }
    });


    async function loadSettings() {
        try {
            const response = await fetch('settings/settings.txt');
            if (!response.ok) throw new Error(`Ошибка загрузки: ${response.statusText}`);

            const settingsObject = await response.json();

            playlist = settingsObject.tracks || [];
            nameElement.textContent = settingsObject.profile.name || "Unknown User";

            discordID = settingsObject.profile.discord || 'c0n1cal';

            let avatarPathFromSettings = settingsObject.profile.avatarPath || "images/avatar.png";

            if (avatarElement) {
                avatarElement.style.backgroundImage = `url("${avatarPathFromSettings}")`;
            }

            if (playlist.length > 0) {
                loadTrack(0, false);
            } else {
                console.warn("Плейлист пуст.");
                trackTitleElement.textContent = "Плейлист пуст";
                albumCoverElement.style.backgroundImage = 'none';
            }

        } catch (error) {
            console.error("Не удалось загрузить или разобрать файл настроек:", error);
        }
    }

    togglePlayButton.addEventListener('click', togglePlayPause);
    playPauseIcon.addEventListener('click', togglePlayPause);
    prevButton.addEventListener('click', prevTrack);
    nextButton.addEventListener('click', nextTrack);
    if (discordIconContainer) {
        discordIconContainer.addEventListener('click', () => {
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