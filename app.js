document.addEventListener('DOMContentLoaded', () => {
    // Tüm inputlara form yakalama için name özelliği tanımla
    document.querySelectorAll('#studentForm input, #studentForm select').forEach(el => {
        if (el.id && !el.name) {
            el.name = el.id;
        }
    });

    // --- Elements ---
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    const form = document.getElementById('studentForm');
    const resetBtn = document.getElementById('formResetBtn');
    const tbody = document.getElementById('studentTableBody');
    const emptyState = document.getElementById('emptyState');
    const searchInput = document.getElementById('searchInput');
    const toast = document.getElementById('toast');
    const editingIdInput = document.getElementById('editingId');

    // --- Formatters & Defaults ---
    const kayitTarihiInput = document.getElementById('kayitTarihi');
    if (!kayitTarihiInput.value) {
        const today = new Date().toISOString().split('T')[0];
        kayitTarihiInput.value = today;
    }

    // --- Genel Form Input ve Money Formatlayıcı ---
    document.addEventListener('input', function(e) {
        let shouldCalculate = false;

        if (e.target.classList.contains('money-input') && !e.target.readOnly) {
            let value = e.target.value.replace(/[^0-9]/g, '');
            if (value.length > 0) {
                e.target.value = parseInt(value, 10).toLocaleString('tr-TR');
            } else {
                e.target.value = '0';
            }
            shouldCalculate = true;
        }

        if (e.target.classList.contains('input-calc-e') || e.target.classList.contains('input-calc-y')) {
            shouldCalculate = true;
        }

        if (shouldCalculate) {
            calculateFinances();
        }
    });

    const phoneInput = document.getElementById('telefon');
    phoneInput.addEventListener('input', function(e) {
        let val = e.target.value.replace(/\D/g, '');
        let formatted = '';
        if (val.length > 0) {
            if (val[0] !== '0') val = '0' + val;
            formatted += val.substring(0, 4);
            if (val.length > 4) formatted += ' ' + val.substring(4, 7);
            if (val.length > 7) formatted += ' ' + val.substring(7, 9);
            if (val.length > 9) formatted += ' ' + val.substring(9, 11);
        }
        e.target.value = formatted;
    });

    // --- Tab Switching ---
    function switchTab(tabId) {
        tabBtns.forEach(btn => btn.classList.remove('active'));
        tabPanes.forEach(pane => pane.classList.remove('active'));
        
        const btn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
        const pane = document.getElementById(tabId);
        if(btn) btn.classList.add('active');
        if(pane) pane.classList.add('active');

        if (tabId === 'ogrenci-listesi') {
            renderTable();
        }
    }

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            switchTab(btn.dataset.tab);
        });
    });

    // --- Data Management ---
    const STORAGE_KEY = 'school_students_data';

    function getStudents() {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    }

    function saveStudents(data) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }

    // --- Toast Notification ---
    function showToast(message, isError = false) {
        toast.textContent = message;
        toast.style.backgroundColor = isError ? 'var(--error-color)' : 'var(--success-color)';
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    // --- Form Submit (Add/Update) ---
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const formData = new FormData(form);
        const studentData = Object.fromEntries(formData.entries());

        const students = getStudents();
        const editingId = editingIdInput.value;

        if (editingId) {
            // Update
            const index = students.findIndex(s => s.id === editingId);
            if (index > -1) {
                studentData.id = editingId;
                students[index] = studentData;
                showToast('Öğrenci bilgileri güncellendi!');
            }
        } else {
            // Add
            studentData.id = Date.now().toString();
            students.push(studentData);
            showToast('Yeni öğrenci kaydedildi!');
        }

        saveStudents(students);
        handleReset();
        switchTab('ogrenci-listesi');
    });

    // --- Reset Form ---
    function handleReset() {
        form.reset();
        editingIdInput.value = '';
        kayitTarihiInput.value = new Date().toISOString().split('T')[0];
    }
    resetBtn.addEventListener('click', handleReset);

    // --- Render Table ---
    function renderTable(filter = '') {
        const students = getStudents();
        tbody.innerHTML = '';

        const filtered = students.filter(s => {
            const term = filter.toLowerCase();
            return (
                (s.veliAdSoyad && s.veliAdSoyad.toLowerCase().includes(term)) || 
                (s.tcNo && s.tcNo.includes(term)) ||
                (s.telefon && s.telefon.includes(term)) ||
                (s.sinif && s.sinif.toLowerCase().includes(term))
            );
        });

        if (filtered.length === 0) {
            emptyState.style.display = 'block';
            document.querySelector('.data-table').style.display = 'none';
        } else {
            emptyState.style.display = 'none';
            document.querySelector('.data-table').style.display = 'table';

            filtered.forEach(student => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${student.tcNo || '-'}</td>
                    <td>${student.sinif || '-'}</td>
                    <td>${student.veliAdSoyad || '-'}</td>
                    <td>${student.kayitTipi || '-'}</td>
                    <td>
                        <span style="font-weight:600; color:var(--primary-color)">
                            ${student.kayitTarihi.split('-').reverse().join('.')}
                        </span>
                    </td>
                    <td class="text-right">
                        <button class="view-btn" onclick="viewStudentDetails('${student.id}')">Detay</button>
                        <button class="edit-btn" onclick="editStudent('${student.id}')">Düzenle</button>
                        <button class="delete-btn" onclick="deleteStudent('${student.id}')">Sil</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }
    }

    searchInput.addEventListener('input', (e) => {
        renderTable(e.target.value);
    });

    // --- Edit Student (Global) ---
    window.editStudent = function(id) {
        const students = getStudents();
        const student = students.find(s => s.id === id);
        
        if (student) {
            // Dropdown & Inputs set
            for (const key in student) {
                if (key !== 'id') {
                    const field = form.elements[key];
                    if (field && key !== 'geldigiIlce' && key !== 'geldigiOkul') {
                        field.value = student[key];
                    }
                }
            }

            // İç içe select (il/ilçe/okul) senkronizasyonu
            if (student.geldigiIl) {
                geldigiIlSelect.dispatchEvent(new Event('change'));
                if (student.geldigiIlce) {
                    geldigiIlceSelect.value = student.geldigiIlce;
                    geldigiIlceSelect.dispatchEvent(new Event('change'));
                    if (student.geldigiOkul) {
                        geldigiOkulSelect.value = student.geldigiOkul;
                    }
                }
            }

            editingIdInput.value = student.id;
            switchTab('kayit-formu');
            
            // Scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    // --- Delete Student (Global) ---
    window.deleteStudent = function(id) {
        if (confirm('Bu öğrencinin kaydını silmek istediğinize emin misiniz?')) {
            let students = getStudents();
            students = students.filter(s => s.id !== id);
            saveStudents(students);
            renderTable(searchInput.value);
            showToast('Öğrenci kaydı silindi.', true);
        }
    };

    // --- Modal Management (View Details) ---
    const detailsModal = document.getElementById('detailsModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const modalBody = document.getElementById('modalBody');
    const modalStudentName = document.getElementById('modalStudentName');

    window.viewStudentDetails = function(id) {
        const students = getStudents();
        const student = students.find(s => s.id === id);
        
        if (student) {
            modalStudentName.textContent = student.veliAdSoyad || 'Öğrenci Detayı';
            
            modalBody.innerHTML = `
                <!-- BÖLÜM 1: ÖĞRENCİ VE KAYIT BİLGİLERİ -->
                <div style="background: #fff; padding: 1.5rem; border-radius: 8px; border: 1px solid var(--border-color); margin-bottom: 2rem;">
                    <h3 style="color: var(--primary-color); border-bottom: 2px solid var(--border-color); padding-bottom: 0.5rem; margin-top: 0;">ÖĞRENCİ VE KAYIT BİLGİLERİ</h3>
                    
                    <table style="width: 100%; text-align: left; margin-top: 1.5rem; border-collapse: collapse; font-size: 0.95rem;">
                        <tbody>
                            <tr style="border-bottom: 1px solid #eee;">
                                <td style="padding: 0.8rem; font-weight: 700; color: var(--text-muted); font-size: 0.8rem; text-transform: uppercase; width: 20%;">TC Numarası</td>
                                <td style="padding: 0.8rem; font-weight: 600; width: 30%;">${student.tcNo || '-'}</td>
                                <td style="padding: 0.8rem; font-weight: 700; color: var(--text-muted); font-size: 0.8rem; text-transform: uppercase; width: 20%;">Kayıt Tarihi</td>
                                <td style="padding: 0.8rem; font-weight: 600; width: 30%; color: var(--primary-color);">${student.kayitTarihi ? student.kayitTarihi.split('-').reverse().join('.') : '-'}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #eee;">
                                <td style="padding: 0.8rem; font-weight: 700; color: var(--text-muted); font-size: 0.8rem; text-transform: uppercase;">Sınıfı</td>
                                <td style="padding: 0.8rem;">${student.sinif || '-'}</td>
                                <td style="padding: 0.8rem; font-weight: 700; color: var(--text-muted); font-size: 0.8rem; text-transform: uppercase;">Telefon Numarası</td>
                                <td style="padding: 0.8rem; font-weight: 600;">${student.telefon || '-'}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #eee;">
                                <td style="padding: 0.8rem; font-weight: 700; color: var(--text-muted); font-size: 0.8rem; text-transform: uppercase;">Veli Adı Soyadı</td>
                                <td style="padding: 0.8rem;">${student.veliAdSoyad || '-'}</td>
                                <td style="padding: 0.8rem; font-weight: 700; color: var(--text-muted); font-size: 0.8rem; text-transform: uppercase;">Geldiği Okul Bilgisi</td>
                                <td style="padding: 0.8rem;">${student.geldigiOkul ? (student.geldigiIl + ' / ' + student.geldigiIlce + ' - ' + student.geldigiOkul) : '-'}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #eee;">
                                <td style="padding: 0.8rem; font-weight: 700; color: var(--text-muted); font-size: 0.8rem; text-transform: uppercase;">Kayıt Tipi / Detayı</td>
                                <td style="padding: 0.8rem;">${student.kayitTipi || '-'} - ${student.kayitTipiDetayi || '-'}</td>
                                <td style="padding: 0.8rem; font-weight: 700; color: var(--text-muted); font-size: 0.8rem; text-transform: uppercase;">Geliş Şekli</td>
                                <td style="padding: 0.8rem;">${student.gelisSekli || '-'}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #eee;">
                                <td style="padding: 0.8rem; font-weight: 700; color: var(--text-muted); font-size: 0.8rem; text-transform: uppercase;">Kardeş TC / Ücret</td>
                                <td style="padding: 0.8rem;">${student.kardesTcNo || '-'} / <span style="color:var(--success-color); font-weight:600;">${student.kardesUcret || '-'}</span></td>
                                <td style="padding: 0.8rem; font-weight: 700; color: var(--text-muted); font-size: 0.8rem; text-transform: uppercase;">Codem Sonucu</td>
                                <td style="padding: 0.8rem;">${student.codemSonucu || '-'}</td>
                            </tr>
                            <tr>
                                <td style="padding: 0.8rem; font-weight: 700; color: var(--text-muted); font-size: 0.8rem; text-transform: uppercase;">Kayıt Bilgisi</td>
                                <td colspan="3" style="padding: 0.8rem;">${student.kayitBilgisi || '-'}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- BÖLÜM 2: FİNANS VE ÖDEME BİLGİLERİ -->
                <div style="background: #fff; padding: 1.5rem; border-radius: 8px; border: 1px solid var(--border-color);">
                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid var(--border-color); padding-bottom: 0.5rem; margin-bottom: 1.5rem;">
                        <h3 style="color: var(--primary-color); margin: 0;">FİNANS VE ÖDEME BİLGİLERİ</h3>
                        <span style="background: #eafaf1; padding: 0.5rem 1.5rem; border-radius: 6px; border: 1px solid #b1e0b5; color: #1e4529; font-size: 1.2rem; font-weight: 800;">
                            GENEL TOPLAM: ${student.z_GenelToplam || '0'} TL
                        </span>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 3rem;">
                        
                        <!-- EĞİTİM BÖLÜMÜ -->
                        <div style="background: #f8fafc; padding: 1.5rem; border-radius: 8px; border: 1px solid #e2e8f0;">
                            <h4 style="margin-top: 0; margin-bottom: 1rem; font-size: 1rem; color: var(--primary-color); border-bottom: 1px solid #cbd5e1; padding-bottom: 0.5rem;">EĞİTİM ÜCRET & ÖDEME DAĞILIMI</h4>
                            
                            <table style="width: 100%; text-align: left; border-collapse: collapse; font-size: 0.9rem;">
                                <tbody>
                                    <tr style="border-bottom: 1px solid #e2e8f0;">
                                        <td style="padding: 0.8rem 0; width: 50%; font-weight: 700; color: var(--text-muted); font-size: 0.75rem;">EĞİTİM ÖDEME ŞEKLİ</td>
                                        <td style="padding: 0.8rem 0; font-weight: 600;">${student.egitimOdemeSekli || '-'}</td>
                                    </tr>
                                    <tr style="border-bottom: 1px solid #e2e8f0;">
                                        <td style="padding: 0.8rem 0; font-weight: 700; color: var(--text-muted); font-size: 0.75rem;">İNDİRİM ORANI / TAKSİT</td>
                                        <td style="padding: 0.8rem 0; font-weight: 600;">% ${student.egitimIndirimOrani || '0'} / <span style="color: var(--primary-color);">${student.egitimTaksit || '-'} Taksit</span></td>
                                    </tr>
                                    <tr style="border-bottom: 2px solid #cbd5e1;">
                                        <td style="padding: 0.8rem 0; font-weight: 700; color: var(--text-main); font-size: 0.85rem;">EĞİTİM TOPLAM (KDV DAHİL)</td>
                                        <td style="padding: 0.8rem 0; font-weight: 800; font-size: 1rem;">${student.ep_Toplam || '0'} TL</td>
                                    </tr>
                                    <tr style="background: #f1f5f9;">
                                        <td colspan="2" style="padding: 0.5rem 0.8rem; font-weight: 700; color: var(--text-muted); font-size: 0.75rem; text-align: center;">DETAYLI DAĞILIM</td>
                                    </tr>
                                    <tr style="border-bottom: 1px dashed #e2e8f0;">
                                        <td style="padding: 0.5rem 0; font-weight: 600; color: var(--text-muted); font-size: 0.8rem;">Nakit/Havale</td>
                                        <td style="padding: 0.5rem 0; font-weight: 600;">${student.ep_Nakit || '0'} TL</td>
                                    </tr>
                                    <tr style="border-bottom: 1px dashed #e2e8f0;">
                                        <td style="padding: 0.5rem 0; font-weight: 600; color: var(--text-muted); font-size: 0.8rem;">K.K Tek Çekim</td>
                                        <td style="padding: 0.5rem 0; font-weight: 600;">${student.ep_KkTek || '0'} TL</td>
                                    </tr>
                                    <tr style="border-bottom: 1px dashed #e2e8f0;">
                                        <td style="padding: 0.5rem 0; font-weight: 600; color: var(--text-muted); font-size: 0.8rem;">K.K Vadeli</td>
                                        <td style="padding: 0.5rem 0; font-weight: 700; color: var(--primary-color);">${student.ep_KkVadeli || '0'} TL</td>
                                    </tr>
                                    <tr style="border-bottom: 1px dashed #e2e8f0;">
                                        <td style="padding: 0.5rem 0; font-weight: 600; color: var(--text-muted); font-size: 0.8rem;">Sanal Pos (Tek / Vad.)</td>
                                        <td style="padding: 0.5rem 0; font-weight: 600;">${student.ep_SpTek || '0'} / ${student.ep_SpVadeli || '0'}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 0.5rem 0; font-weight: 600; color: var(--text-muted); font-size: 0.8rem;">OTS / Mahsup</td>
                                        <td style="padding: 0.5rem 0; font-weight: 600;">${student.ep_Ots || '0'} / ${student.ep_Mahsup || '0'}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <!-- YEMEK BÖLÜMÜ -->
                        <div style="${student.yemekDurumu !== 'EVET' ? 'opacity: 0.5; filter: grayscale(1);' : 'background: #f8fafc; padding: 1.5rem; border-radius: 8px; border: 1px solid #e2e8f0;'}">
                            <h4 style="margin-top: 0; margin-bottom: 1rem; font-size: 1rem; color: var(--primary-color); border-bottom: 1px solid #cbd5e1; padding-bottom: 0.5rem;">YEMEK ÜCRET & ÖDEME DAĞILIMI</h4>
                            
                            <table style="width: 100%; text-align: left; border-collapse: collapse; font-size: 0.9rem;">
                                <tbody>
                                    <tr style="border-bottom: 1px solid #e2e8f0;">
                                        <td style="padding: 0.8rem 0; width: 50%; font-weight: 700; color: var(--text-muted); font-size: 0.75rem;">YEMEK SERVİSİ</td>
                                        <td style="padding: 0.8rem 0; font-weight: 700; color: ${(student.yemekDurumu === 'EVET' ? 'var(--success-color)' : 'var(--error-color)')};">${student.yemekDurumu || 'HAYIR'}</td>
                                    </tr>
                                    <tr style="border-bottom: 1px solid #e2e8f0;">
                                        <td style="padding: 0.8rem 0; font-weight: 700; color: var(--text-muted); font-size: 0.75rem;">ÖDEME ŞEKLİ / TAKSİT</td>
                                        <td style="padding: 0.8rem 0; font-weight: 600;">${student.yemekOdemeSekli || '-'} / <span style="color: var(--primary-color);">${student.yemekTaksit || '-'} Taksit</span></td>
                                    </tr>
                                    <tr style="border-bottom: 2px solid #cbd5e1;">
                                        <td style="padding: 0.8rem 0; font-weight: 700; color: var(--text-main); font-size: 0.85rem;">YEMEK TOPLAM (KDV DAHİL)</td>
                                        <td style="padding: 0.8rem 0; font-weight: 800; font-size: 1rem;">${student.yp_Toplam || '0'} TL</td>
                                    </tr>
                                    <tr style="background: #f1f5f9;">
                                        <td colspan="2" style="padding: 0.5rem 0.8rem; font-weight: 700; color: var(--text-muted); font-size: 0.75rem; text-align: center;">DETAYLI DAĞILIM</td>
                                    </tr>
                                    <tr style="border-bottom: 1px dashed #e2e8f0;">
                                        <td style="padding: 0.5rem 0; font-weight: 600; color: var(--text-muted); font-size: 0.8rem;">Nakit/Havale</td>
                                        <td style="padding: 0.5rem 0; font-weight: 600;">${student.yp_Nakit || '0'} TL</td>
                                    </tr>
                                    <tr style="border-bottom: 1px dashed #e2e8f0;">
                                        <td style="padding: 0.5rem 0; font-weight: 600; color: var(--text-muted); font-size: 0.8rem;">K.K Tek Çekim</td>
                                        <td style="padding: 0.5rem 0; font-weight: 600;">${student.yp_KkTek || '0'} TL</td>
                                    </tr>
                                    <tr style="border-bottom: 1px dashed #e2e8f0;">
                                        <td style="padding: 0.5rem 0; font-weight: 600; color: var(--text-muted); font-size: 0.8rem;">K.K Vadeli</td>
                                        <td style="padding: 0.5rem 0; font-weight: 700; color: var(--primary-color);">${student.yp_KkVadeli || '0'} TL</td>
                                    </tr>
                                    <tr style="border-bottom: 1px dashed #e2e8f0;">
                                        <td style="padding: 0.5rem 0; font-weight: 600; color: var(--text-muted); font-size: 0.8rem;">Sanal Pos (Tek / Vad.)</td>
                                        <td style="padding: 0.5rem 0; font-weight: 600;">${student.yp_SpTek || '0'} / ${student.yp_SpVadeli || '0'}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 0.5rem 0; font-weight: 600; color: var(--text-muted); font-size: 0.8rem;">OTS / Mahsup</td>
                                        <td style="padding: 0.5rem 0; font-weight: 600;">${student.yp_Ots || '0'} / ${student.yp_Mahsup || '0'}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            `;
            
            detailsModal.classList.add('show');
        }
    };

    function closeModal() {
        detailsModal.classList.remove('show');
    }

    closeModalBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (e) => {
        if (e.target === detailsModal) {
            closeModal();
        }
    });

    // --- Settings / Kontrol Paneli Management ---
    const SETTINGS_KEY = 'school_settings_data';
    
    function getSettings() {
        let settings = JSON.parse(localStorage.getItem(SETTINGS_KEY));
        if (!settings) {
            settings = {
                sinifList: ['1. Sınıf', '2. Sınıf', '3. Sınıf', '4. Sınıf', '5. Sınıf', '6. Sınıf', '7. Sınıf', '8. Sınıf', '9. Sınıf', '10. Sınıf', '11. Sınıf', '12. Sınıf'],
                kayitBilgisiList: ['Yeni Kayıt', 'Kayıt Yenileme'],
                kayitTipiList: ['Dış Kayıt', 'İç Kayıt', 'Kardeş', 'Burslu', 'Personel'],
                gelisSekliList: ['Referans', 'Web', 'Kurum Dışı Arayan', 'Bizzat Gelen'],
                kkFaizOrani: 4.25 // Varsayılan panel faiz oranı
            };
            saveSettings(settings);
        }
        return settings;
    }

    function saveSettings(settings) {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    }

    // Populate Dropdowns in form
    function renderDropdowns() {
        const settings = getSettings();
        
        const dropdownMaps = {
            'sinif': settings.sinifList,
            'kayitBilgisi': settings.kayitBilgisiList,
            'kayitTipi': settings.kayitTipiList,
            'gelisSekli': settings.gelisSekliList
        };

        for (const [selectId, optionsArray] of Object.entries(dropdownMaps)) {
            const selectEl = document.getElementById(selectId);
            if (selectEl) {
                selectEl.innerHTML = ''; // "Seçiniz" kaldırıldı
                optionsArray.forEach(opt => {
                    const option = document.createElement('option');
                    option.value = opt;
                    option.textContent = opt;
                    selectEl.appendChild(option);
                });
            }
        }
        
        // Sabit menülerin (Seçiniz seçeneği HTML'den kalktığı için) kendi ilk seçeneğinde kalmasını sağla
        const kayitTipiDetayi = document.getElementById('kayitTipiDetayi');
        const codemSonucu = document.getElementById('codemSonucu');
        if (kayitTipiDetayi && kayitTipiDetayi.options.length > 0) kayitTipiDetayi.selectedIndex = 0;
        if (codemSonucu && codemSonucu.options.length > 0) codemSonucu.selectedIndex = 0;
    }

    // Render Kontrol Paneli lists
    function renderSettingsPanels() {
        const settings = getSettings();

        const panelMaps = {
            'sinifListContainer': { list: settings.sinifList, key: 'sinifList' },
            'kayitBilgisiListContainer': { list: settings.kayitBilgisiList, key: 'kayitBilgisiList' },
            'kayitTipiListContainer': { list: settings.kayitTipiList, key: 'kayitTipiList' },
            'gelisSekliListContainer': { list: settings.gelisSekliList, key: 'gelisSekliList' }
        };

        for (const [containerId, data] of Object.entries(panelMaps)) {
            const container = document.getElementById(containerId);
            if (container) {
                container.innerHTML = '';
                data.list.forEach(item => {
                    const li = document.createElement('li');
                    li.innerHTML = `
                        <span>${item}</span>
                        <button class="delete-btn" onclick="deleteSetting('${data.key}', '${item}')">Sil</button>
                    `;
                    container.appendChild(li);
                });
            }
        }
        
        const faizEl = document.getElementById('currentKkFaiz');
        if(faizEl) faizEl.textContent = settings.kkFaizOrani;
    }

    // Global Fonksiyonlar (Ekle ve Sil)
    window.addSetting = function(listKey, inputId) {
        const input = document.getElementById(inputId);
        const val = input.value.trim();
        if (val) {
            const settings = getSettings();
            // Case-insensitive duplicate check
            const exists = settings[listKey].some(item => item.toLowerCase() === val.toLowerCase());
            if (!exists) {
                settings[listKey].push(val);
                saveSettings(settings);
                input.value = '';
                renderSettingsPanels();
                renderDropdowns();
                showToast('Ayar eklendi!');
            } else {
                showToast('Bu ayar zaten mevcut.', true);
            }
        }
    };

    window.deleteSetting = function(listKey, itemValue) {
        if(confirm('Bu ayarı silmek istediğinize emin misiniz? Formlarda seçili yerlerde eksiklik çıkabilir!')) {
            const settings = getSettings();
            settings[listKey] = settings[listKey].filter(i => i !== itemValue);
            saveSettings(settings);
            renderSettingsPanels();
            renderDropdowns();
            showToast('Ayar silindi!');
        }
    };

    window.saveKkFaiz = function() {
        const input = document.getElementById('kkFaizInput');
        let val = parseFloat(input.value);
        if(!isNaN(val) && val >= 0) {
            const settings = getSettings();
            settings.kkFaizOrani = val;
            saveSettings(settings);
            input.value = '';
            renderSettingsPanels();
            calculateFinances(); // Faust değiştiği için formu tetikle
            showToast('Kredi Kartı Faiz Oranı güncellendi!');
        } else {
            showToast('Lütfen geçerli bir oran girin.', true);
        }
    };

    // Initialize list on load
    renderDropdowns();
    renderSettingsPanels();

    // --- Kolay Test İçin Dummy Veri Doldurma ---
    const tcInput = document.getElementById('tcNo');
    const adInput = document.getElementById('veliAdSoyad');
    const telInput = document.getElementById('telefon');
    
    function setDummyData() {
        tcInput.value = "12345678910";
        adInput.value = "Test Velisi";
        telInput.value = "05555555555";
    }
    
    setDummyData(); // Sayfa açılışında doldur
    
    // Tıklandığında eğer hala varsayılan dummy formatındaysa anında sil
    tcInput.addEventListener('focus', function() { if (this.value === "12345678910") this.value = ""; });
    adInput.addEventListener('focus', function() { if (this.value === "Test Velisi") this.value = ""; });
    telInput.addEventListener('focus', function() { if (this.value === "05555555555") this.value = ""; });
    
    // Form temizlendiğinde yine dummy test verisi dolsun
    formResetBtn.addEventListener('click', () => { setTimeout(setDummyData, 10); });

    // --- CSV & Location Dropdowns (Geldiği Okul) ---
    const geldigiIlSelect = document.getElementById('geldigiIl');
    const geldigiIlceSelect = document.getElementById('geldigiIlce');
    const geldigiOkulSelect = document.getElementById('geldigiOkul');

    let allSchools = []; 

    async function loadSchools() {
        try {
            // schoolsData.js içerisindeki değişkenden okuyoruz (CORS hatasını önlemek için)
            if (typeof schoolsBase64Data === 'undefined') {
                throw new Error("schoolsData.js yüklenemedi.");
            }

            const binaryString = atob(schoolsBase64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            const decoder = new TextDecoder('utf-8');
            const csvText = decoder.decode(bytes);
            
            const rows = csvText.split('\n').map(row => row.trim()).filter(row => row.length > 0);
            
            for(let i=1; i<rows.length; i++) {
                // Ignore commas inside quotes if any, simple split is mostly enough based on preview
                const cols = rows[i].split(',');
                if (cols.length >= 3) {
                    allSchools.push({
                        City: cols[0],
                        District: cols[1],
                        SchoolName: cols[2]
                    });
                }
            }
            populateCities();
        } catch(err) {
            console.error("CSV Yüklenirken Hata:", err);
            geldigiIlSelect.innerHTML = '<option value="" disabled selected>Okul veritabanı yüklenemedi</option>';
        }
    }

    function populateCities() {
        const uniqueCities = [...new Set(allSchools.map(s => s.City))].sort();
        geldigiIlSelect.innerHTML = '<option value="" disabled selected>İl Seçiniz</option>';
        uniqueCities.forEach(city => {
            const opt = document.createElement('option');
            opt.value = city;
            opt.textContent = city;
            geldigiIlSelect.appendChild(opt);
        });
    }

    geldigiIlSelect.addEventListener('change', (e) => {
        const selectedCity = e.target.value;
        const districts = [...new Set(allSchools.filter(s => s.City === selectedCity).map(s => s.District))].sort();

        geldigiIlceSelect.innerHTML = '<option value="" disabled selected>İlçe Seçiniz</option>';
        geldigiOkulSelect.innerHTML = '<option value="" disabled selected>Önce İlçe Seçiniz</option>';
        geldigiIlceSelect.disabled = false;
        geldigiOkulSelect.disabled = true;

        districts.forEach(dist => {
            const opt = document.createElement('option');
            opt.value = dist;
            opt.textContent = dist;
            geldigiIlceSelect.appendChild(opt);
        });
    });

    geldigiIlceSelect.addEventListener('change', (e) => {
        const selectedCity = geldigiIlSelect.value;
        const selectedDist = e.target.value;
        const schools = [...new Set(allSchools.filter(s => s.City === selectedCity && s.District === selectedDist).map(s => s.SchoolName))].sort();

        geldigiOkulSelect.innerHTML = '<option value="" disabled selected>Okul Seçiniz</option>';
        geldigiOkulSelect.disabled = false;

        schools.forEach(sch => {
            const opt = document.createElement('option');
            opt.value = sch;
            opt.textContent = sch;
            geldigiOkulSelect.appendChild(opt);
        });
    });

    loadSchools();

    // ============================================
    // --- FİNANS & ÖDEME HESAPLAMA MODÜLÜ ---
    // ============================================
    const yemekDurumuSelect = document.getElementById('yemekDurumu');
    const yemekFieldsContainer = document.querySelectorAll('.yemek-fields');

    if (yemekDurumuSelect) {
        yemekDurumuSelect.addEventListener('change', function() {
            if (this.value === 'EVET') {
                yemekFieldsContainer.forEach(el => el.classList.remove('disable-overlay'));
            } else {
                yemekFieldsContainer.forEach(el => el.classList.add('disable-overlay'));
            }
            calculateFinances();
        });
    }

    const t_egitimTaksit = document.getElementById('egitimTaksit');
    const t_yemekTaksit = document.getElementById('yemekTaksit');

    if(t_egitimTaksit) t_egitimTaksit.addEventListener('change', calculateFinances);
    if(t_yemekTaksit) t_yemekTaksit.addEventListener('change', calculateFinances);

    function getNumVal(elementId) {
        const input = document.getElementById(elementId);
        if(!input || !input.value) return 0;
        return parseInt(input.value.replace(/[^0-9]/g, ''), 10) || 0;
    }

    function setNumVal(elementId, value) {
        const input = document.getElementById(elementId);
        if(input) {
            input.value = Math.round(value).toLocaleString('tr-TR');
        }
    }

    function calculateFinances() {
        const settings = getSettings();
        const r = (parseFloat(settings.kkFaizOrani) || 0) / 100;
        
        // PMT fonksiyonu (Aylık tutar döndürür)
        function faizliAylikHesapla(anaPara, taksitSayisi) {
            if (anaPara <= 0 || taksitSayisi <= 1 || r === 0) return anaPara / (taksitSayisi || 1);
            const factor = Math.pow(1 + r, taksitSayisi);
            return anaPara * ((r * factor) / (factor - 1));
        }

        // --- 1. EĞİTİM HESAPLAMALARI ---
        const ep_Nakit = getNumVal('ep_Nakit');
        const ep_KkTek = getNumVal('ep_KkTek');
        const ep_KkVadeli = getNumVal('ep_KkVadeli'); // Ana para kabul edilecek
        const ep_SpTek = getNumVal('ep_SpTek');
        const ep_SpVadeli = getNumVal('ep_SpVadeli');
        const ep_Ots = getNumVal('ep_Ots');
        const ep_Mahsup = getNumVal('ep_Mahsup');

        const egitimTaksitSayisi = parseInt(t_egitimTaksit ? t_egitimTaksit.value : 6, 10);
        
        let ep_KkFaizliToplam = ep_KkVadeli;
        if (ep_KkVadeli > 0 && egitimTaksitSayisi > 0) {
            let aylik = faizliAylikHesapla(ep_KkVadeli, egitimTaksitSayisi);
            ep_KkFaizliToplam = aylik * egitimTaksitSayisi;
            document.getElementById('ep_AylikTutar').textContent = Math.round(aylik).toLocaleString('tr-TR') + ' x ' + egitimTaksitSayisi + ' (Tpl: ' + Math.round(ep_KkFaizliToplam).toLocaleString('tr-TR') + ')';
        } else {
            document.getElementById('ep_AylikTutar').textContent = '';
        }

        // Ara Toplam
        let toplamEgitim = ep_Nakit + ep_KkTek + ep_KkFaizliToplam + ep_SpTek + ep_SpVadeli + ep_Ots + ep_Mahsup;
        
        // İndirim Uygulaması
        let indirimInputEl = document.getElementById('egitimIndirimOrani');
        if (indirimInputEl && indirimInputEl.value) {
            let indirimStr = indirimInputEl.value.replace(/[^0-9.,]/g, '').replace(',', '.');
            let indirimOrani = parseFloat(indirimStr);
            if (!isNaN(indirimOrani) && indirimOrani > 0) {
                toplamEgitim = toplamEgitim - (toplamEgitim * (indirimOrani / 100));
            }
        }

        // Dinamik KDV Oranı Çekme
        const egitimKdvOrani = parseFloat(document.getElementById('egitimKdvOrani').value) || 10;
        const egitimNet = toplamEgitim / (1 + (egitimKdvOrani / 100));
        const egitimKdv = toplamEgitim - egitimNet;
        
        setNumVal('ep_Toplam', toplamEgitim);
        setNumVal('ep_NetUcret', egitimNet);
        setNumVal('ep_KdvTutar', egitimKdv);

        const toplamEgitimPesinat = ep_Nakit + ep_KkTek + ep_SpTek + ep_Mahsup;
        setNumVal('ep_Pesinat', toplamEgitimPesinat);

        // --- 2. YEMEK HESAPLAMALARI ---
        let toplamYemek = 0;
        let yemekNet = 0;
        let yemekKdv = 0;
        let yp_KkFaizliToplam = 0;
        
        const isYemekActive = yemekDurumuSelect && yemekDurumuSelect.value === 'EVET';
        const yemekKdvOrani = parseFloat(document.getElementById('yemekKdvOrani').value) || 10;
        
        if (isYemekActive) {
            const yp_Nakit = getNumVal('yp_Nakit');
            const yp_KkTek = getNumVal('yp_KkTek');
            const yp_KkVadeli = getNumVal('yp_KkVadeli');
            const yp_SpTek = getNumVal('yp_SpTek');
            const yp_SpVadeli = getNumVal('yp_SpVadeli');
            const yp_Ots = getNumVal('yp_Ots');
            const yp_Mahsup = getNumVal('yp_Mahsup');

            const yemekTaksitSayisi = parseInt(t_yemekTaksit ? t_yemekTaksit.value : 8, 10);
            
            yp_KkFaizliToplam = yp_KkVadeli;
            if (yp_KkVadeli > 0 && yemekTaksitSayisi > 0) {
                let aylik = faizliAylikHesapla(yp_KkVadeli, yemekTaksitSayisi);
                yp_KkFaizliToplam = aylik * yemekTaksitSayisi;
                document.getElementById('yp_AylikTutar').textContent = Math.round(aylik).toLocaleString('tr-TR') + ' x ' + yemekTaksitSayisi + ' (Tpl: ' + Math.round(yp_KkFaizliToplam).toLocaleString('tr-TR') + ')';
            } else {
                document.getElementById('yp_AylikTutar').textContent = '';
            }

            toplamYemek = yp_Nakit + yp_KkTek + yp_KkFaizliToplam + yp_SpTek + yp_SpVadeli + yp_Ots + yp_Mahsup;
            yemekNet = toplamYemek / (1 + (yemekKdvOrani / 100)); 
            yemekKdv = toplamYemek - yemekNet;
        } 
        
        setNumVal('yp_Toplam', toplamYemek);
        setNumVal('yp_NetUcret', yemekNet);
        setNumVal('yp_KdvTutar', yemekKdv);

        // --- 3. GENEL TOPLAMLAR ---
        const genelToplam = toplamEgitim + toplamYemek;
        setNumVal('z_GenelToplam', genelToplam);
        
        const egitimTaksitToplam = ep_KkFaizliToplam + getNumVal('ep_SpVadeli') + getNumVal('ep_Ots');
        const yemekTaksitToplam = isYemekActive ? (yp_KkFaizliToplam + getNumVal('yp_SpVadeli') + getNumVal('yp_Ots')) : 0;
        setNumVal('z_GenelTaksit', (egitimTaksitToplam + yemekTaksitToplam));
    }
    
    setTimeout(calculateFinances, 100);



});

// --- OTOMATİK DOLDURMA (TEST/ÖRNEK) ---
window.autoFillForm = function() {
    const rNum = Math.floor(Math.random() * 90000) + 10000;
    
    // Öğrenci
    document.getElementById('tcNo').value = "11122233" + Math.floor(Math.random() * 900 + 100);
    document.getElementById('veliAdSoyad').value = "Örnek Veli " + rNum;
    document.getElementById('telefon').value = "0532" + Math.floor(Math.random() * 900000 + 100000);
    
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('kayitTarihi').value = today;

    // Dropdownlar (Varsa 2. opsiyon, yoksa 1. opsiyon)
    const setSelectRandomly = (id) => {
        const el = document.getElementById(id);
        if(el && el.options.length > 0) {
            el.selectedIndex = el.options.length > 1 ? 1 : 0;
            // Manuel trigger
            el.dispatchEvent(new Event('change'));
        }
    };

    setSelectRandomly('sinif');
    setSelectRandomly('kayitBilgisi');
    setSelectRandomly('kayitTipi');
    setSelectRandomly('gelisSekli');

    document.getElementById('geldigiIl').value = "İSTANBUL";
    document.getElementById('geldigiIlce').value = "KADIKÖY";
    document.getElementById('geldigiOkulText').value = "Örnek Ortaokulu";

    // --- FİNANS EĞİTİM (Örnek Türkiye Fiyatı: 250.000 TL Eğitim) ---
    document.getElementById('egitimIndirimOrani').value = "10"; // %10 İndirim
    document.getElementById('ep_Nakit').value = "50000"; // 50.000 Nakit
    document.getElementById('ep_KkVadeli').value = "150000"; // 150.000 KK Vadeli
    document.getElementById('egitimTaksit').value = "10"; // 10 taksit
    document.getElementById('egitimVadeTarihi').value = today;

    // --- FİNANS YEMEK (Örnek Türkiye Fiyatı: 60.000 TL Yemek) ---
    const yemekDurumuEl = document.getElementById('yemekDurumu');
    if (yemekDurumuEl) {
        yemekDurumuEl.value = "EVET";
        yemekDurumuEl.dispatchEvent(new Event('change'));
        
        document.getElementById('yp_KkVadeli').value = "60000";
        document.getElementById('yemekTaksit').value = "10";
        document.getElementById('yemekVadeTarihi').value = today;
    }

    // Modal formatlamalarını tetiklemesi için her keyup/input simüle et
    document.querySelectorAll('.input-calc-e, .input-calc-y, .money-input').forEach(el => {
        el.dispatchEvent(new Event('input'));
    });

    // Sayfanın en üstüne kay
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // Uygulama mesajı
    if (window.showToast) window.showToast("Test verileri başarıyla dolduruldu!");
};
