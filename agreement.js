const agreementText = `
Заходя на сайт RIPSITE, вы полностью принимаете на себя всю ответственность за свои действия. 

Разработчик сайта, хозяин сайта - не несёт никакой ответственности за данный сайт.
`.trim();

function showAgreement() {
    const modalHTML = `
        <div id="agreementModal" style="position: fixed; inset: 0; background: rgba(9,9,15,0.96); backdrop-filter: blur(12px); z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 1rem;">
            <div style="background: #101015; border: 1px solid #1e1e28; border-radius: 18px; max-width: 560px; width: 100%; padding: 2.5rem 2rem; position: relative; color: #e0e0ff;">
                <h2 style="color: #c11f2b; font-family: 'Orbitron', sans-serif; text-align: center; margin-bottom: 1.5rem; font-size: 1.8rem;">
                    Пользовательское соглашение
                </h2>
                <div style="line-height: 1.7; font-size: 1.05rem; color: #d0d0ee; margin-bottom: 2rem;">
                    ${agreementText}
                </div>
                <div style="text-align: center;">
                    <button onclick="acceptAgreement()" 
                            style="background: #c11f2b; color: white; border: none; padding: 14px 32px; border-radius: 12px; font-size: 1.1rem; font-weight: 600; cursor: pointer;">
                        Я принимаю условия
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function acceptAgreement() {
    const modal = document.getElementById('agreementModal');
    if (modal) modal.remove();
    localStorage.setItem('agreementAccepted', 'true');
}

window.addEventListener('load', () => {
    if (!localStorage.getItem('agreementAccepted')) {
        setTimeout(showAgreement, 800);
    }
});