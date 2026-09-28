# Galeria — fotos reais do dia

Pasta pronta para receber as fotos definitivas do Batizado da Maria Cecilia.

Quando as fotos chegarem (ex: `~/Desktop/fotos-batizado/`), pedir para o Claude:
1. redimensionar (máx. ~1600px no lado maior) e converter para `.webp` ou `.jpg` otimizado
2. salvar aqui em `public/galeria/`
3. atualizar os `<button class="g-item">` em `index.html` (seção `#galeria`) para apontar
   para os novos arquivos, no lugar dos placeholders atuais (`maria-cecilia.jpg`,
   `santuario.jpg`, `bistral.jpg`)

Nunca commitar foto de celular sem otimizar antes — arquivo de 3-5MB cru deixa o site lento.
