/*jshint esversion:6*/

$(function() {
    const CONFIG = {
        publishable_key: "rf_5w20VzQObTXjJhTjq6kad9ubrm33",
        model: "blackjack-cards-vex7n",
        version: 2,
        confidenceThreshold: 0.5,
        cameraMode: "environment",
        soft17: true,
        doubleAfterSplit: true,
        surrender: true,
        deckCount: 6
    };

    let model = null;
    let video = $("#video")[0];
    let canvas = null;
    let ctx = null;
    let isDetecting = false;
    let dealerUpcard = "A";
    let detectedCards = new Map();
    let stats = {
        totalHands: 0,
        blackjacks: 0,
        busts: 0,
        pairs: 0
    };
    let lastDetectionTime = 0;
    let frameCount = 0;
    let fps = 0;

    const CARD_MAP = {
        '10C': { rank: '10', suit: 'clubs', value: 10, symbol: '♣' },
        '10D': { rank: '10', suit: 'diamonds', value: 10, symbol: '♦' },
        '10H': { rank: '10', suit: 'hearts', value: 10, symbol: '♥' },
        '10S': { rank: '10', suit: 'spades', value: 10, symbol: '♠' },
        '2C': { rank: '2', suit: 'clubs', value: 2, symbol: '♣' },
        '2D': { rank: '2', suit: 'diamonds', value: 2, symbol: '♦' },
        '2H': { rank: '2', suit: 'hearts', value: 2, symbol: '♥' },
        '2S': { rank: '2', suit: 'spades', value: 2, symbol: '♠' },
        '3C': { rank: '3', suit: 'clubs', value: 3, symbol: '♣' },
        '3D': { rank: '3', suit: 'diamonds', value: 3, symbol: '♦' },
        '3H': { rank: '3', suit: 'hearts', value: 3, symbol: '♥' },
        '3S': { rank: '3', suit: 'spades', value: 3, symbol: '♠' },
        '4C': { rank: '4', suit: 'clubs', value: 4, symbol: '♣' },
        '4D': { rank: '4', suit: 'diamonds', value: 4, symbol: '♦' },
        '4H': { rank: '4', suit: 'hearts', value: 4, symbol: '♥' },
        '4S': { rank: '4', suit: 'spades', value: 4, symbol: '♠' },
        '5C': { rank: '5', suit: 'clubs', value: 5, symbol: '♣' },
        '5D': { rank: '5', suit: 'diamonds', value: 5, symbol: '♦' },
        '5H': { rank: '5', suit: 'hearts', value: 5, symbol: '♥' },
        '5S': { rank: '5', suit: 'spades', value: 5, symbol: '♠' },
        '6C': { rank: '6', suit: 'clubs', value: 6, symbol: '♣' },
        '6D': { rank: '6', suit: 'diamonds', value: 6, symbol: '♦' },
        '6H': { rank: '6', suit: 'hearts', value: 6, symbol: '♥' },
        '6S': { rank: '6', suit: 'spades', value: 6, symbol: '♠' },
        '7C': { rank: '7', suit: 'clubs', value: 7, symbol: '♣' },
        '7D': { rank: '7', suit: 'diamonds', value: 7, symbol: '♦' },
        '7H': { rank: '7', suit: 'hearts', value: 7, symbol: '♥' },
        '7S': { rank: '7', suit: 'spades', value: 7, symbol: '♠' },
        '8C': { rank: '8', suit: 'clubs', value: 8, symbol: '♣' },
        '8D': { rank: '8', suit: 'diamonds', value: 8, symbol: '♦' },
        '8H': { rank: '8', suit: 'hearts', value: 8, symbol: '♥' },
        '8S': { rank: '8', suit: 'spades', value: 8, symbol: '♠' },
        '9C': { rank: '9', suit: 'clubs', value: 9, symbol: '♣' },
        '9D': { rank: '9', suit: 'diamonds', value: 9, symbol: '♦' },
        '9H': { rank: '9', suit: 'hearts', value: 9, symbol: '♥' },
        '9S': { rank: '9', suit: 'spades', value: 9, symbol: '♠' },
        'AC': { rank: 'A', suit: 'clubs', value: 11, symbol: '♣' },
        'AD': { rank: 'A', suit: 'diamonds', value: 11, symbol: '♦' },
        'AH': { rank: 'A', suit: 'hearts', value: 11, symbol: '♥' },
        'AS': { rank: 'A', suit: 'spades', value: 11, symbol: '♠' },
        'JC': { rank: 'J', suit: 'clubs', value: 10, symbol: '♣' },
        'JD': { rank: 'J', suit: 'diamonds', value: 10, symbol: '♦' },
        'JH': { rank: 'J', suit: 'hearts', value: 10, symbol: '♥' },
        'JS': { rank: 'J', suit: 'spades', value: 10, symbol: '♠' },
        'KC': { rank: 'K', suit: 'clubs', value: 10, symbol: '♣' },
        'KD': { rank: 'K', suit: 'diamonds', value: 10, symbol: '♦' },
        'KH': { rank: 'K', suit: 'hearts', value: 10, symbol: '♥' },
        'KS': { rank: 'K', suit: 'spades', value: 10, symbol: '♠' },
        'QC': { rank: 'Q', suit: 'clubs', value: 10, symbol: '♣' },
        'QD': { rank: 'Q', suit: 'diamonds', value: 10, symbol: '♦' },
        'QH': { rank: 'Q', suit: 'hearts', value: 10, symbol: '♥' },
        'QS': { rank: 'Q', suit: 'spades', value: 10, symbol: '♠' }
    };

    async function init() {
        try {
            showToast('Iniciando cámara y modelo...', 'info');
            
            await Promise.all([
                initCamera(),
                loadModel()
            ]);
            
            setupCanvas();
            
            $("#loadingScreen").addClass("hidden");
            $("body").removeClass("loading");
            
            isDetecting = true;
            detectFrame();
            
            showToast('¡Sistema listo! Apunta la cámara a las cartas', 'success');
            
        } catch (error) {
            console.error("Error de inicialización:", error);
            showToast('Error: ' + error.message, 'error');
        }
    }

    async function initCamera() {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
                facingMode: CONFIG.cameraMode,
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            }
        });
        
        video.srcObject = stream;
        
        return new Promise((resolve) => {
            video.onloadeddata = () => {
                video.play();
                resolve();
            };
        });
    }

    async function loadModel() {
        return new Promise((resolve, reject) => {
            roboflow.auth({
                publishable_key: CONFIG.publishable_key
            }).load({
                model: CONFIG.model,
                version: CONFIG.version
            }).then((m) => {
                model = m;
                window.model = model;
                resolve();
            }).catch(reject);
        });
    }

    function setupCanvas() {
        canvas = document.getElementById("overlay");
        ctx = canvas.getContext("2d");
        resizeCanvas();
        $(window).resize(resizeCanvas);
    }

    function resizeCanvas() {
        if (!video.videoWidth) return;
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const container = $(".video-container");
        const containerWidth = container.width();
        const containerHeight = container.height();
        
        const videoRatio = video.videoWidth / video.videoHeight;
        const containerRatio = containerWidth / containerHeight;
        
        let displayWidth, displayHeight;
        
        if (containerRatio > videoRatio) {
            displayHeight = containerHeight;
            displayWidth = displayHeight * videoRatio;
        } else {
            displayWidth = containerWidth;
            displayHeight = displayWidth / videoRatio;
        }
        
        $(canvas).css({
            width: displayWidth,
            height: displayHeight,
            left: (containerWidth - displayWidth) / 2,
            top: (containerHeight - displayHeight) / 2
        });
    }

    async function detectFrame() {
        if (!isDetecting || !model) {
            requestAnimationFrame(detectFrame);
            return;
        }
        
        const now = Date.now();
        frameCount++;
        
        if (now - lastDetectionTime >= 1000) {
            fps = frameCount;
            frameCount = 0;
            lastDetectionTime = now;
            $("#fps").text(fps);
        }
        
        try {
            const predictions = await model.detect(video);
            
            const validPredictions = predictions.filter(p => 
                p.confidence >= CONFIG.confidenceThreshold
            );
            
            if (validPredictions.length > 0) {
                const avgConfidence = validPredictions.reduce((sum, p) => 
                    sum + p.confidence, 0) / validPredictions.length;
                $("#confidence").text(Math.round(avgConfidence * 100) + "%");
            }
            
            processDetections(validPredictions);
            renderPredictions(validPredictions);
            
        } catch (error) {
            console.error("Error en detección:", error);
        }
        
        requestAnimationFrame(detectFrame);
    }

    function processDetections(predictions) {
        const currentCards = new Map();
        
        predictions.forEach(pred => {
            const cardInfo = CARD_MAP[pred.class];
            if (cardInfo) {
                const cardId = `${Math.round(pred.bbox.x)}-${Math.round(pred.bbox.y)}`;
                currentCards.set(cardId, {
                    ...cardInfo,
                    class: pred.class,
                    confidence: pred.confidence,
                    bbox: pred.bbox
                });
            }
        });
        
        const newCards = [];
        currentCards.forEach((card, id) => {
            if (!detectedCards.has(id)) {
                newCards.push(card);
            }
        });
        
        if (newCards.length > 0) {
            detectedCards = currentCards;
            updateUI();
            
            const cardArray = Array.from(detectedCards.values());
            if (cardArray.length === 2) {
                stats.totalHands++;
                if (isBlackjack(cardArray)) stats.blackjacks++;
                if (isPair(cardArray)) stats.pairs++;
                updateStats();
            }
        } else if (currentCards.size === 0 && detectedCards.size > 0) {
            detectedCards.clear();
            updateUI();
        }
    }

    function renderPredictions(predictions) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const scaleX = canvas.width / video.videoWidth;
        const scaleY = canvas.height / video.videoHeight;
        
        predictions.forEach(pred => {
            const x = pred.bbox.x - pred.bbox.width / 2;
            const y = pred.bbox.y - pred.bbox.height / 2;
            const width = pred.bbox.width;
            const height = pred.bbox.height;
            
            const confidence = pred.confidence;
            let color = '#ef4444';
            if (confidence > 0.7) color = '#10b981';
            else if (confidence > 0.5) color = '#f59e0b';
            
            ctx.shadowColor = color;
            ctx.shadowBlur = 20;
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.strokeRect(x * scaleX, y * scaleY, width * scaleX, height * scaleY);
            ctx.shadowBlur = 0;
            
            const cardInfo = CARD_MAP[pred.class];
            const label = cardInfo ? `${cardInfo.rank}${cardInfo.symbol}` : pred.class;
            ctx.font = 'bold 20px Inter';
            const textWidth = ctx.measureText(label).width;
            const textHeight = 24;
            
            ctx.fillStyle = color;
            ctx.fillRect(
                x * scaleX, 
                (y * scaleY) - textHeight - 8, 
                textWidth + 16, 
                textHeight + 8
            );
            
            ctx.fillStyle = '#000000';
            ctx.textBaseline = 'bottom';
            ctx.fillText(label, (x * scaleX) + 8, (y * scaleY) - 4);
            
            ctx.font = '14px Inter';
            const confText = Math.round(confidence * 100) + '%';
            const confWidth = ctx.measureText(confText).width;
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(
                x * scaleX,
                (y + height) * scaleY,
                confWidth + 12,
                22
            );
            ctx.fillStyle = '#ffffff';
            ctx.fillText(confText, (x * scaleX) + 6, (y + height) * scaleY + 16);
        });
    }

    function updateUI() {
        const cards = Array.from(detectedCards.values());
        
        renderDetectedCards(cards);
        
        const handAnalysis = analyzeHand(cards);
        
        $("#handValue .value").text(handAnalysis.total || "--");
        
        const handTypeEl = $("#handType");
        handTypeEl.removeClass("soft pair bust blackjack");
        
        if (cards.length === 0) {
            handTypeEl.text("Esperando cartas...");
        } else if (handAnalysis.isBlackjack) {
            handTypeEl.text("¡BLACKJACK!").addClass("blackjack");
        } else if (handAnalysis.busted) {
            handTypeEl.text(`¡BUST! (${handAnalysis.total})`).addClass("bust");
            if (!stats.busts) stats.busts = 0;
            stats.busts++;
            updateStats();
        } else if (handAnalysis.isPair) {
            handTypeEl.text(`Par de ${handAnalysis.rank}s`).addClass("pair");
        } else if (handAnalysis.isSoft) {
            handTypeEl.text(`Soft ${handAnalysis.total}`).addClass("soft");
        } else {
            handTypeEl.text(`Hard ${handAnalysis.total}`);
        }
        
        if (cards.length > 0 && !handAnalysis.busted) {
            const strategy = determineStrategy(handAnalysis, cards);
            renderStrategy(strategy);
        } else {
            resetStrategy();
        }
    }

    function renderDetectedCards(cards) {
        const container = $("#detectedCards");
        container.empty();
        
        if (cards.length === 0) {
            container.html('<p class="empty-state">Apunta la cámara a las cartas</p>');
            return;
        }
        
        cards.forEach(card => {
            const cardEl = $(`
                <div class="detected-card ${card.suit}">
                    <span class="rank">${card.rank}</span>
                    <span class="suit">${card.symbol}</span>
                </div>
            `);
            container.append(cardEl);
        });
    }

    function analyzeHand(cards) {
        if (cards.length === 0) {
            return { total: 0, isSoft: false, isPair: false, busted: false, isBlackjack: false };
        }
        
        let total = 0;
        let aces = 0;
        let isPair = false;
        let rank = null;
        
        if (cards.length === 2) {
            const rank1 = cards[0].rank;
            const rank2 = cards[1].rank;
            const value1 = cards[0].value;
            const value2 = cards[1].value;
            
            if (rank1 === rank2 || (value1 === 10 && value2 === 10)) {
                isPair = true;
                rank = cards[0].rank;
                if (value1 === 10) rank = "10";
            }
        }
        
        cards.forEach(card => {
            total += card.value;
            if (card.rank === 'A') aces++;
        });
        
        let isSoft = aces > 0;
        while (total > 21 && aces > 0) {
            total -= 10;
            aces--;
        }
        
        if (aces === 0) isSoft = false;
        
        const isBlackjack = cards.length === 2 && total === 21;
        const busted = total > 21;
        
        return { total, isSoft, isPair, rank, busted, isBlackjack, aces };
    }

    function determineStrategy(analysis, cards) {
        const dealerValue = getDealerCardValue();
        
        if (analysis.isBlackjack) {
            return {
                action: 'blackjack',
                text: '¡Blackjack!',
                icon: 'fa-trophy',
                description: 'Has ganado con Blackjack natural. Pago 3:2.'
            };
        }
        
        if (analysis.busted) {
            return {
                action: 'bust',
                text: 'Bust',
                icon: 'fa-times-circle',
                description: 'Te has pasado de 21. Pierdes la apuesta.'
            };
        }
        
        if (analysis.isPair && cards.length === 2) {
            const splitStrategy = getSplitStrategy(analysis.rank, dealerValue);
            if (splitStrategy.shouldSplit) {
                return {
                    action: 'split',
                    text: 'DIVIDIR',
                    icon: 'fa-code-branch',
                    description: `Divide tus ${analysis.rank}s contra ${dealerUpcard} del crupier.`
                };
            }
        }
        
        if (analysis.isSoft) {
            const softStrategy = getSoftStrategy(analysis.total, dealerValue, cards.length === 2);
            return {
                action: softStrategy.action,
                text: softStrategy.text,
                icon: softStrategy.icon,
                description: softStrategy.description
            };
        }
        
        const hardStrategy = getHardStrategy(analysis.total, dealerValue, cards.length === 2);
        return {
            action: hardStrategy.action,
            text: hardStrategy.text,
            icon: hardStrategy.icon,
            description: hardStrategy.description
        };
    }

    function getSplitStrategy(pairRank, dealerValue) {
        const shouldSplit = {
            'A': true,
            '8': true,
            '2': dealerValue <= 7,
            '3': dealerValue <= 7,
            '6': dealerValue <= 6,
            '7': dealerValue <= 7,
            '9': dealerValue !== 7 && dealerValue !== 10 && dealerValue !== 11,
            '4': dealerValue === 5 || dealerValue === 6,
            '5': false,
            '10': false
        };
        
        return { shouldSplit: shouldSplit[pairRank] || false };
    }

    function getSoftStrategy(total, dealerValue, canDouble) {
        if (total >= 20) {
            return {
                action: 'stand',
                text: 'PLANTARSE',
                icon: 'fa-hand-paper',
                description: `Soft ${total} es muy fuerte. Plantarse siempre.`
            };
        }
        
        if (total === 19) {
            if (canDouble && (dealerValue === 6)) {
                return {
                    action: 'double',
                    text: 'DOBLAR',
                    icon: 'fa-coins',
                    description: 'Doblar contra 6 del crupier.'
                };
            }
            return {
                action: 'stand',
                text: 'PLANTARSE',
                icon: 'fa-hand-paper',
                description: 'Soft 19 es fuerte. Plantarse.'
            };
        }
        
        if (total === 18) {
            if (canDouble && (dealerValue >= 2 && dealerValue <= 6)) {
                return {
                    action: 'double',
                    text: 'DOBLAR',
                    icon: 'fa-coins',
                    description: 'Doblar contra 2-6 del crupier.'
                };
            }
            if (dealerValue >= 7 && dealerValue <= 8) {
                return {
                    action: 'stand',
                    text: 'PLANTARSE',
                    icon: 'fa-hand-paper',
                    description: 'Plantarse contra 7-8.'
                };
            }
            return {
                action: 'hit',
                text: 'PEDIR CARTA',
                icon: 'fa-plus',
                description: 'Pedir carta contra 9, 10 o A.'
            };
        }
        
        if (canDouble) {
            if ((total === 17 && (dealerValue >= 3 && dealerValue <= 6)) ||
                (total === 16 && (dealerValue >= 4 && dealerValue <= 6)) ||
                (total === 15 && (dealerValue >= 4 && dealerValue <= 6)) ||
                (total === 14 && (dealerValue >= 5 && dealerValue <= 6)) ||
                (total === 13 && (dealerValue >= 5 && dealerValue <= 6))) {
                return {
                    action: 'double',
                    text: 'DOBLAR',
                    icon: 'fa-coins',
                    description: `Doblar Soft ${total} contra ${dealerValue}.`
                };
            }
        }
        
        return {
            action: 'hit',
            text: 'PEDIR CARTA',
            icon: 'fa-plus',
            description: `Pedir carta con Soft ${total}.`
        };
    }

    function getHardStrategy(total, dealerValue, canDouble) {
        if (total >= 17) {
            return {
                action: 'stand',
                text: 'PLANTARSE',
                icon: 'fa-hand-paper',
                description: `${total} o más. Plantarse siempre.`
            };
        }
        
        if (total === 16) {
            if (dealerValue >= 2 && dealerValue <= 6) {
                return {
                    action: 'stand',
                    text: 'PLANTARSE',
                    icon: 'fa-hand-paper',
                    description: 'Plantarse contra 2-6. Riesgo de bust alto.'
                };
            }
            if (CONFIG.surrender && (dealerValue === 9 || dealerValue === 10 || dealerValue === 11)) {
                return {
                    action: 'surrender',
                    text: 'RENDIRSE',
                    icon: 'fa-flag',
                    description: 'Rendirse y recuperar la mitad de la apuesta.'
                };
            }
            return {
                action: 'hit',
                text: 'PEDIR CARTA',
                icon: 'fa-plus',
                description: 'Pedir carta. El crupier tiene carta fuerte.'
            };
        }
        
        if (total === 15) {
            if (dealerValue >= 2 && dealerValue <= 6) {
                return {
                    action: 'stand',
                    text: 'PLANTARSE',
                    icon: 'fa-hand-paper',
                    description: 'Plantarse contra 2-6.'
                };
            }
            if (CONFIG.surrender && dealerValue === 10) {
                return {
                    action: 'surrender',
                    text: 'RENDIRSE',
                    icon: 'fa-flag',
                    description: 'Rendirse contra 10 es marginalmente mejor.'
                };
            }
            return {
                action: 'hit',
                text: 'PEDIR CARTA',
                icon: 'fa-plus',
                description: 'Pedir carta contra carta fuerte.'
            };
        }
        
        if (total >= 13 && total <= 14) {
            if (dealerValue >= 2 && dealerValue <= 6) {
                return {
                    action: 'stand',
                    text: 'PLANTARSE',
                    icon: 'fa-hand-paper',
                    description: `Plantarse con ${total} contra 2-6.`
                };
            }
            return {
                action: 'hit',
                text: 'PEDIR CARTA',
                icon: 'fa-plus',
                description: `Pedir carta con ${total} contra ${dealerValue}.`
            };
        }
        
        if (total === 12) {
            if (dealerValue >= 4 && dealerValue <= 6) {
                return {
                    action: 'stand',
                    text: 'PLANTARSE',
                    icon: 'fa-hand-paper',
                    description: 'Plantarse contra 4-6 (crupier puede bustear).'
                };
            }
            return {
                action: 'hit',
                text: 'PEDIR CARTA',
                icon: 'fa-plus',
                description: 'Pedir carta. 12 es débil contra carta alta.'
            };
        }
        
        if (total === 11 && canDouble) {
            return {
                action: 'double',
                text: 'DOBLAR',
                icon: 'fa-coins',
                description: '¡Doblar siempre con 11! Gran ventaja.'
            };
        }
        
        if (total === 10 && canDouble && dealerValue <= 9) {
            return {
                action: 'double',
                text: 'DOBLAR',
                icon: 'fa-coins',
                description: 'Doblar con 10 contra 2-9.'
            };
        }
        
        if (total === 9 && canDouble && (dealerValue >= 3 && dealerValue <= 6)) {
            return {
                action: 'double',
                text: 'DOBLAR',
                icon: 'fa-coins',
                description: 'Doblar con 9 contra 3-6.'
            };
        }
        
        return {
            action: 'hit',
            text: 'PEDIR CARTA',
            icon: 'fa-plus',
            description: `Pedir carta con ${total}.`
        };
    }

    function renderStrategy(strategy) {
        const recEl = $("#recommendation");
        const iconEl = recEl.find(".action-icon");
        const textEl = recEl.find(".action-text");
        const detailsEl = $("#strategyDetails");
        
        recEl.removeClass("hit stand double split surrender blackjack bust");
        recEl.addClass(strategy.action);
        
        iconEl.html(`<i class="fas ${strategy.icon}"></i>`);
        textEl.text(strategy.text);
        detailsEl.text(strategy.description);
    }

    function resetStrategy() {
        const recEl = $("#recommendation");
        recEl.removeClass("hit stand double split surrender blackjack bust");
        recEl.find(".action-icon").html('<i class="fas fa-hand-paper"></i>');
        recEl.find(".action-text").text("Esperando...");
        $("#strategyDetails").text("Apunta la cámara a tus cartas para recibir recomendaciones.");
    }

    function getDealerCardValue() {
        if (dealerUpcard === 'A') return 11;
        return parseInt(dealerUpcard);
    }

    function isBlackjack(cards) {
        if (cards.length !== 2) return false;
        const hasAce = cards.some(c => c.rank === 'A');
        const hasTen = cards.some(c => c.value === 10);
        return hasAce && hasTen;
    }

    function isPair(cards) {
        if (cards.length !== 2) return false;
        return cards[0].rank === cards[1].rank || 
               (cards[0].value === 10 && cards[1].value === 10);
    }

    function updateStats() {
        $("#totalHands").text(stats.totalHands);
        $("#blackjacks").text(stats.blackjacks);
        $("#busts").text(stats.busts);
        $("#pairs").text(stats.pairs);
    }

    $(".card-btn").click(function() {
        $(".card-btn").removeClass("selected");
        $(this).addClass("selected");
        dealerUpcard = $(this).data("value");
        showToast(`Carta del crupier: ${$(this).find(".card-rank").text()}`, 'info');
        updateUI();
    });

    $("#toggleSettings").click(() => {
        $("#settingsModal").addClass("active");
    });

    $("#closeSettings").click(() => {
        $("#settingsModal").removeClass("active");
    });

    $("#settingsModal").click((e) => {
        if (e.target === $("#settingsModal")[0]) {
            $("#settingsModal").removeClass("active");
        }
    });

    $("#confidenceThreshold").on("input", function() {
        const val = Math.round($(this).val() * 100);
        $("#confidenceValue").text(val + "%");
    });

    $("#saveSettings").click(() => {
        CONFIG.cameraMode = $("#cameraMode").val();
        CONFIG.confidenceThreshold = parseFloat($("#confidenceThreshold").val());
        CONFIG.soft17 = $("#soft17").is(":checked");
        CONFIG.doubleAfterSplit = $("#doubleAfterSplit").is(":checked");
        CONFIG.surrender = $("#surrender").is(":checked");
        CONFIG.deckCount = parseInt($("#deckCount").val());
        
        $("#settingsModal").removeClass("active");
        showToast('Configuración guardada', 'success');
    });

    function showToast(message, type = 'info') {
        const toast = $(`
            <div class="toast ${type}">
                ${message}
            </div>
        `);
        
        $("#toastContainer").append(toast);
        
        setTimeout(() => {
            toast.fadeOut(300, function() {
                $(this).remove();
            });
        }, 3000);
    }

    init();
});
