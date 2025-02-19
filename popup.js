document.addEventListener('DOMContentLoaded', function() {
    const startButton = document.getElementById('startButton');
    const copyButton = document.getElementById('copyButton');
    const clearButton = document.getElementById('clearButton');
    const outputText = document.getElementById('outputText');
    const status = document.getElementById('status');
    const micIcon = document.querySelector('.mic-icon');
    let recognition = null;
    let isRecording = false;

    function showPermissionInstructions() {
        const container = document.querySelector('.container');
        
        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm';
        
        const modal = document.createElement('div');
        modal.className = 'relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden transform transition-all duration-300 ease-in-out scale-95 opacity-0 animate-modal-popup';
        
        const content = document.createElement('div');
        content.innerHTML = `
            <div class="p-6">
                <div class="flex items-center justify-center mb-6">
                    <div class="bg-[#e5eeff] rounded-full p-4 animate-pulse">
                        <i class="fas fa-microphone-alt text-4xl text-[#2F6FDD] mic-icon"></i>
                    </div>
                </div>

                <h2 class="text-2xl font-bold text-center text-gray-800 mb-4">
                    السماح باستخدام الميكروفون
                </h2>

                <p class="text-center text-gray-600 mb-6">
                    للاستفادة من ميزة التحويل الصوتي، نحتاج إلى إذنك لاستخدام الميكروفون
                </p>

                <div class="space-y-4">
                    <div class="bg-[#e5eeff] border-r-4 border-[#2F6FDD] p-4 flex items-center">
                        <i class="fas fa-info-circle text-[#2F6FDD] ml-3 text-2xl"></i>
                        <p class="text-[#2F6FDD] text-sm">
                            يمكنك السماح للإضافة باستخدام الميكروفون من خلال الزر أدناه
                        </p>
                    </div>

                    <button id="openExtensionSettingsBtn" class="w-full bg-[#2F6FDD] text-white py-3 rounded-lg hover:bg-[#2558b3] transition-all duration-300 flex items-center justify-center gap-2">
                        <i class="fas fa-cog"></i>
                        <span>فتح إعدادات الإضافة</span>
                    </button>

                    <button id="reloadBtn" class="w-full bg-[#e5eeff] text-[#2F6FDD] py-3 rounded-lg hover:bg-[#d0e0ff] transition-all duration-300 flex items-center justify-center gap-2">
                        <i class="fas fa-sync-alt"></i>
                        <span>تحديث الصفحة</span>
                    </button>
                </div>
            </div>
        `;
        
        modal.appendChild(content);
        overlay.appendChild(modal);
        container.appendChild(overlay);
        
        // إضافة الأحداث
        const closeOverlay = () => {
            overlay.classList.add('opacity-0', 'scale-95');
            setTimeout(() => overlay.remove(), 300);
        };
        
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeOverlay();
            }
        });
        
        const openExtensionSettingsBtn = content.querySelector('#openExtensionSettingsBtn');
        openExtensionSettingsBtn.addEventListener('click', () => {
            const extensionId = chrome.runtime.id;
            chrome.tabs.create({
                url: `chrome://settings/content/siteDetails?site=chrome-extension://${extensionId}`
            });
        });
        
        const reloadBtn = content.querySelector('#reloadBtn');
        reloadBtn.addEventListener('click', () => {
            window.location.reload();
        });
        
        // إضافة رسوم متحركة للظهور
        setTimeout(() => {
            modal.classList.remove('scale-95', 'opacity-0');
        }, 50);
        
        return overlay;
    }

    function updateStartButton(recording) {
        const icon = startButton.querySelector('i');
        const text = startButton.querySelector('span');
        const micIcon = document.querySelector('.mic-icon');
        
        if (recording) {
            startButton.classList.remove('btn-primary');
            startButton.classList.add('btn-danger', 'recording-pulse');
            icon.classList.remove('fa-microphone');
            icon.classList.add('fa-stop');
            text.textContent = 'إيقاف التسجيل';
            micIcon.classList.add('text-red-500');
        } else {
            startButton.classList.remove('btn-danger', 'recording-pulse');
            startButton.classList.add('btn-primary');
            icon.classList.remove('fa-stop');
            icon.classList.add('fa-microphone');
            text.textContent = 'بدء التسجيل';
            micIcon.classList.remove('text-red-500');
        }
    }

    function showStatus(message, type = 'info') {
        status.textContent = message;
        status.className = 'mt-4 text-sm text-center min-h-[20px] transition-colors duration-300 ';
        
        switch(type) {
            case 'error':
                status.classList.add('text-red-600');
                break;
            case 'success':
                status.classList.add('text-green-600');
                break;
            default:
                status.classList.add('text-gray-600');
        }
    }

    async function requestMicrophonePermission() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: true,
                video: false
            });
            stream.getTracks().forEach(track => track.stop());
            return true;
        } catch (error) {
            console.error('Microphone permission error:', error);
            showStatus('يرجى السماح باستخدام المايكروفون من إعدادات المتصفح', 'error');
            showPermissionInstructions();
            return false;
        }
    }

    async function initializeSpeechRecognition() {
        if (!recognition) {
            if (!window.webkitSpeechRecognition) {
                showStatus('عذراً، متصفحك لا يدعم خاصية التعرف على الصوت', 'error');
                return false;
            }

            const hasPermission = await requestMicrophonePermission();
            if (!hasPermission) {
                return false;
            }

            recognition = new webkitSpeechRecognition();
            recognition.lang = 'ar-SA';
            recognition.continuous = true;
            recognition.interimResults = true;

            let finalTranscript = '';

            recognition.onstart = function() {
                isRecording = true;
                updateStartButton(true);
                showStatus('جارٍ الاستماع...', 'info');
                finalTranscript = outputText.value || '';
            };

            recognition.onresult = function(event) {
                let interimTranscript = '';

                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript + ' ';
                        outputText.value = finalTranscript;
                    } else {
                        interimTranscript += transcript;
                    }
                }

                if (interimTranscript) {
                    showStatus('جارٍ التعرف: ' + interimTranscript, 'info');
                }
            };

            recognition.onerror = function(event) {
                console.error('Speech recognition error:', event.error);
                
                let errorMessage = 'حدث خطأ في التعرف على الصوت';
                if (event.error === 'no-speech') {
                    errorMessage = 'لم يتم التقاط أي صوت. حاول مرة أخرى';
                } else if (event.error === 'network') {
                    errorMessage = 'تأكد من اتصالك بالإنترنت';
                } else if (event.error === 'not-allowed') {
                    errorMessage = 'يرجى السماح باستخدام المايكروفون من إعدادات المتصفح';
                    showPermissionInstructions();
                }
                showStatus(errorMessage, 'error');
                stopRecording();
            };

            recognition.onend = function() {
                if (isRecording) {
                    try {
                        recognition.start();
                    } catch (e) {
                        console.error('Error restarting recognition:', e);
                        stopRecording();
                    }
                } else {
                    stopRecording();
                }
            };
        }
        return true;
    }

    function stopRecording() {
        isRecording = false;
        updateStartButton(false);
        showStatus('', 'info');
        if (recognition) {
            try {
                recognition.stop();
            } catch (e) {
                console.error('Error stopping recognition:', e);
            }
        }
    }

    function showCopiedFeedback() {
        const icon = copyButton.querySelector('i');
        const text = copyButton.querySelector('span');
        const originalIcon = icon.className;
        const originalText = text.textContent;

        icon.className = 'fas fa-check text-white';
        text.textContent = 'تم النسخ';
        copyButton.classList.remove('btn-secondary');
        copyButton.classList.add('btn-success', 'transform', 'scale-105', 'shadow-lg');

        copyButton.style.animation = 'copyPulse 0.5s ease-in-out';

        setTimeout(() => {
            icon.className = originalIcon;
            text.textContent = originalText;
            copyButton.classList.remove('btn-success', 'transform', 'scale-105', 'shadow-lg');
            copyButton.classList.add('btn-secondary');
            copyButton.style.animation = 'none';
        }, 2000);
    }

    startButton.addEventListener('click', async function() {
        if (isRecording) {
            stopRecording();
        } else {
            showStatus('جاري طلب إذن الميكروفون...', 'info');
            if (await initializeSpeechRecognition()) {
                try {
                    recognition.start();
                } catch (error) {
                    console.error('Error starting recognition:', error);
                    showStatus('حدث خطأ في بدء التسجيل', 'error');
                    stopRecording();
                }
            }
        }
    });

    copyButton.addEventListener('click', function() {
        if (outputText.value) {
            navigator.clipboard.writeText(outputText.value).then(function() {
                showStatus('تم نسخ النص إلى الحافظة', 'success');
                showCopiedFeedback();
            }).catch(function(err) {
                showStatus('حدث خطأ أثناء نسخ النص', 'error');
                console.error('Error copying text:', err);
            });
        } else {
            showStatus('لا يوجد نص للنسخ', 'error');
        }
    });

    clearButton.addEventListener('click', function() {
        outputText.value = '';
        showStatus('تم مسح النص', 'success');
        setTimeout(() => {
            showStatus('');
        }, 1500);
    });

    outputText.addEventListener('focus', function() {
        this.classList.add('ring-2', 'ring-blue-500', 'border-transparent');
    });

    outputText.addEventListener('blur', function() {
        this.classList.remove('ring-2', 'ring-blue-500', 'border-transparent');
    });
});
