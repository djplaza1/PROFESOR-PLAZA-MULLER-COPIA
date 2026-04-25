        /** Conectores típicos al inicio de frase (no incluimos und/oder/aber para reducir falsos positivos). */
        const MULLER_BX_CONN_START = ['weil', 'dass', 'obwohl', 'wenn', 'als', 'damit', 'ob', 'bevor', 'nachdem', 'deshalb', 'deswegen', 'darum', 'trotzdem', 'dann', 'danach', 'außerdem', 'denn', 'sondern', 'falls', 'sobald', 'solange', 'während', 'zuerst', 'anschließend', 'schließlich', 'zunächst', 'inzwischen', 'allerdings', 'jedoch', 'hingegen', 'folglich', 'trotz', 'außer', 'indem'];

        function mullerClassifyBibliotecaLine(german, meta) {
            if (!german || typeof german !== 'string') return 'vocabulario';
            const g = german.replace(/\s+/g, ' ').trim();
            const lower = g.toLowerCase();
            if (meta && meta.isRedemittel) return 'redemittel';

            const firstTok = lower.split(/[\s,.;:]+/).filter(Boolean)[0] || '';
            if (MULLER_BX_CONN_START.includes(firstTok)) return 'conectores';

            const connMulti = ['zuerst', 'danach', 'später', 'schließlich', 'zunächst', 'anschließend', 'inzwischen', 'deswegen', 'trotzdem', 'allerdings', 'hingegen', 'folglich', 'außerdem', 'jedoch', 'dafür', 'dagegen', 'dabei', 'sonst'];
            if (connMulti.some((c) => lower.startsWith(c + ' '))) return 'conectores';

            if (/^(können|könnte|könnten|dürfte|dürfen|entschuldigung|vielen dank|danke|herzlichen|guten tag|guten morgen|guten abend|bis bald|auf wiedersehen|wie bitte|kein problem|ich möchte|ich hätte gerne|ich würde gerne|lass uns|wir könnten|ich bin der meinung)/i.test(lower) && g.length < 140) return 'redemittel';

            if (/^(sich\s+[a-zäöüß]+\s+(an|auf|für|von|über|mit|zu)\b)/i.test(g)) return 'verbos';
            if (/\b(freuen|erinnern|halten|denken|sorgen|interessieren|vorbereiten|kümmern|verlassen|verzichten|bewerben|verabreden|entscheiden|einigen|bemühen|verstehen|bedanken)\s+(mich|dich|sich|uns|euch)?\s*(an|auf|für|von|über|mit|zu|in)\b/i.test(lower)) return 'verbos';

            const words = g.split(/\s+/).filter(Boolean);
            if (meta && meta.isPair && words.length <= 5) return 'vocabulario';

            if (words.length <= 3 && /^[a-zäöüß]+(en|eln|ern)$/i.test(words[0])) return 'verbos';

            if (/^(an|auf|in|mit|für|zu|von|über|unter|vor|nach|aus|bei|gegen|ohne|um|anstatt|trotz|während)\s+(dem|der|den|das|die|ein|eine|mich|dir|mir|sich|ihm|ihr|uns|euch)/i.test(g)) return 'preposiciones';

            if (/\b(an|auf|in|mit|für|zu|von|über|nach|vor|aus|bei)\s+(dem|der|den|das|die|ein|eine|mich|dich|sich)\b/i.test(lower)) {
                if (/^(ich|du|er|sie|es|wir|ihr|man|sie)\s+/i.test(g)) return 'preposiciones';
                if (words.length <= 8) return 'preposiciones';
            }

            if (/^(ich|du|er|sie|es|wir|ihr|man)\s+.+\b(an|auf|mit|für|zu|von|über|in|nach|vor|aus|bei)\s+(dem|der|den|das|die|ein|eine|mich|dich|sich)\b/i.test(g)) return 'preposiciones';

            return 'vocabulario';
        }

        function mullerExtractBibliotecaSegments(raw) {
            const out = [];
            if (!raw || typeof raw !== 'string') return out;
            const lines = raw.split(/\n/);
            for (let line of lines) {
                line = line.trim();
                if (!line || line.startsWith('#')) continue;

                const speakerMatch = line.match(/^([^:]+):\s*(.+)$/);
                if (speakerMatch) {
                    let content = speakerMatch[2];
                    const isRedemittel = /\[R\]|\bNützlich\b/i.test(content);
                    content = content.replace(/\[R\]/g, '').replace(/\bNützlich\.?\s*/gi, '').trim();

                    let vocabInner = null;
                    const vocabMatch = content.match(/\[(.*?)\]/);
                    if (vocabMatch) {
                        vocabInner = vocabMatch[1];
                        content = content.replace(vocabMatch[0], '').trim();
                    }

                    let translation = '';
                    const transMatch = content.match(/\(([^)]+)\)/);
                    if (transMatch) {
                        translation = transMatch[1].trim();
                        content = content.replace(transMatch[0], '').trim();
                    }

                    const germanText = content.replace(/[🔴🔵🟢•]/g, '').replace(/\s+/g, ' ').trim();
                    if (germanText) out.push({ german: germanText, es: translation, isRedemittel });

                    if (vocabInner) {
                        vocabInner.split(',').forEach((piece) => {
                            const parts = piece.split('-');
                            if (parts.length >= 2) {
                                const de = parts[0].trim().replace(/[🔴🔵🟢•]/g, '');
                                const es = parts.slice(1).join('-').trim();
                                if (de) out.push({ german: de, es: es, isRedemittel: false, isPair: true });
                            }
                        });
                    }
                    continue;
                }

                const pairMatch = line.match(/^(.+?)\s*[-–—]\s*(.+)$/);
                if (pairMatch && !line.includes(':')) {
                    const de = pairMatch[1].replace(/^[•\-\d.)\]]+\s*/, '').trim();
                    const es = pairMatch[2].trim();
                    const looksDe = /[äöüßÄÖÜ]/.test(de) || /^(der|die|das|ein|eine|ich|du|sich|und|nicht)\b/i.test(de);
                    if (de && es && looksDe) {
                        out.push({ german: de, es: es, isRedemittel: false, isPair: true });
                        continue;
                    }
                }

                const plain = line.replace(/^[•\-\d.)\]]+\s*/, '').trim();
                if (plain.length >= 2) out.push({ german: plain, es: '', isRedemittel: false });
            }
            return out;
        }

        /** Lista plana de ítems para distribuir (sin duplicados). */
        function mullerBibliotecaFlatItems(text) {
            const segs = mullerExtractBibliotecaSegments(text);
            const out = [];
            const seen = new Set();
            for (const seg of segs) {
                const cat = mullerClassifyBibliotecaLine(seg.german, seg);
                const es = seg.es && seg.es.length ? seg.es : '(añade traducción en la tarjeta)';
                const item = {
                    b1: seg.german,
                    b2: seg.german,
                    es: es,
                    trick: 'Biblioteca · ' + cat + ' · heurística local (sin IA)'
                };
                const k = mullerBxItemKey(item) + '|' + cat;
                if (seen.has(k)) continue;
                seen.add(k);
                out.push({ cat, item, seg });
            }
            return out;
        }

        /** Heurística local B1 vs B2 por frase (no es IA; revisa en B1/B2 si falla). */
        function mullerGuessBibliotecaItemLevel(item, seg) {
            const g = (item.b1 || '').trim();
            if (!g) return 'b1';
            const lower = g.toLowerCase();
            const words = g.split(/\s+/).filter(Boolean);
            const w = words.length;

            if (seg && seg.isPair && w <= 5) return 'b1';

            if (/\b(Herausforderung|Bedeutung|Maßnahmen|entsprechend|voraussichtlich|gleichwohl|insofern|hinsichtlich|bezüglich|unabhängig davon|im Hinblick auf|von großer)\b/i.test(g)) return 'b2';
            if (/\b(sodass|sofern|sobald|solange|anstatt dass|ohne dass|wobei|wodurch|weshalb)\b/i.test(lower)) return 'b2';
            if (/\b(dessen|deren|wessen)\b/i.test(lower) && w > 4) return 'b2';
            if (g.length > 115) return 'b2';
            if (w >= 17) return 'b2';
            if (/\b(wurde|wurden|worden)\b/i.test(lower) && w > 6) return 'b2';

            if (w <= 10 && g.length <= 75) return 'b1';
            if (w <= 13) return 'b1';

            return 'b2';
        }

        function mullerBibliotecaTextToBxBuckets(text) {
            const buckets = { vocabulario: [], verbos: [], preposiciones: [], conectores: [], redemittel: [] };
            const flat = mullerBibliotecaFlatItems(text);
            for (const { cat, item } of flat) {
                buckets[cat].push(item);
            }
            return {
                buckets,
                counts: {
                    vocabulario: buckets.vocabulario.length,
                    verbos: buckets.verbos.length,
                    preposiciones: buckets.preposiciones.length,
                    conectores: buckets.conectores.length,
                    redemittel: buckets.redemittel.length,
                    total: flat.length
                }
            };
        }
