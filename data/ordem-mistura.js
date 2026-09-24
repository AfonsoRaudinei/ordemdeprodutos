/*
  Regra de ordem de mistura — fonte: planilha "Tecnologia de Aplicação" (Nortox).
  Este arquivo é a ÚNICA fonte da regra: para mudar a sequência, edite aqui.

  pos     = posição na sequência (menor = entra primeiro no tanque)
  sigla   = como aparece no app (códigos equivalentes ficam juntos: "WG / GRDA")
  aviso   = chave do texto de orientação exibido dentro do passo (ou null)
*/
window.ORDEM_MISTURA = {
  agua: { pos: 1, nome: 'Água' },

  avisos: {
    preMistura:
      'Faça a pré-mistura em balde ou pré-misturador: coloque o produto na parte líquida e agite até homogeneizar. Mantenha a agitação constante até o produto ficar homogêneo na calda.',
    adjuvante:
      'Adicione direto no tanque, com agitação suficiente para dispersar, ou pré-dilua na proporção de 5:1 até 10:1 (água:produto).'
  },

  rodape:
    'A sequência é baseada em literatura e bibliografia de campo e pode variar conforme cada pulverização. Siga a orientação de um Engenheiro Agrônomo habilitado. Fonte: Nortox, Tecnologia de Aplicação.',

  formulacoes: [
    { pos: 2,  sigla: 'Corretivo',   nome: 'Complexantes, quelatizantes, corretivos de pH', grupo: 'Corretivos de água', aviso: null },
    { pos: 3,  sigla: 'WG / GRDA',   nome: 'Grânulos dispersíveis em água',                 grupo: 'Sólidos insolúveis', aviso: 'preMistura' },
    { pos: 4,  sigla: 'DF',          nome: 'Dry Flowable (fluido seco)',                    grupo: 'Sólidos insolúveis', aviso: null },
    { pos: 5,  sigla: 'WP / PM',     nome: 'Pó molhável',                                   grupo: 'Sólidos solúveis',   aviso: 'preMistura' },
    { pos: 6,  sigla: 'SP / PS',     nome: 'Pó solúvel',                                    grupo: 'Sólidos solúveis',   aviso: null },
    { pos: 7,  sigla: 'SC',          nome: 'Suspensão concentrada',                         grupo: 'Suspensões',         aviso: null },
    { pos: 8,  sigla: 'CS',          nome: 'Suspensão de encapsulados',                     grupo: 'Suspensões',         aviso: null },
    { pos: 9,  sigla: 'OD',          nome: 'Dispersível em óleo',                           grupo: 'Intermediários',     aviso: null },
    { pos: 10, sigla: 'SE',          nome: 'Suspo-emulsão',                                 grupo: 'Intermediários',     aviso: null },
    { pos: 11, sigla: 'EW',          nome: 'Emulsão em água',                               grupo: 'Emulsões',           aviso: null },
    { pos: 12, sigla: 'OE',          nome: 'Óleo emulsionável',                             grupo: 'Emulsões',           aviso: null },
    { pos: 13, sigla: 'CE',          nome: 'Concentrado emulsionável',                      grupo: 'Emulsões',           aviso: null },
    { pos: 14, sigla: 'LS',          nome: 'Líquido solúvel',                               grupo: 'Líquidos solúveis',  aviso: null },
    { pos: 15, sigla: 'SANC / SAC',  nome: 'Solução aquosa (concentrada ou não)',           grupo: 'Líquidos solúveis',  aviso: null },
    { pos: 16, sigla: 'Solução',     nome: 'Solução verdadeira',                            grupo: 'Adjuvantes, óleos e espalhantes', aviso: null },
    { pos: 17, sigla: 'Adjuvante',   nome: 'Tensoativos, redutores de deriva',              grupo: 'Adjuvantes, óleos e espalhantes', aviso: 'adjuvante' }
  ]
};
