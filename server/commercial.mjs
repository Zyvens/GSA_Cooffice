export const PROJECT_TIERS=[
 {porte:'Compacto',min:1,max:3,project_cents:190000},
 {porte:'Padrão',min:4,max:6,project_cents:290000},
 {porte:'Amplo',min:7,max:10,project_cents:440000},
 {porte:'Residência',min:11,max:16,project_cents:660000},
 {porte:'Especial',min:17,max:null,project_cents:900000,minimum:true}
];

export function projectPrice(environments){
 const n=Number(environments);
 if(!Number.isInteger(n)||n<1||n>200)throw Object.assign(new Error('Informe uma quantidade válida de ambientes.'),{status:400});
 const tier=PROJECT_TIERS.find(t=>n>=t.min&&(t.max===null||n<=t.max));
 return {
  environments:n,
  porte:tier.porte,
  project_cents:tier.project_cents,
  label:tier.minimum?'a partir de':'preço fechado do Projeto Executivo',
  source:'05 · Precificação — escada por ambiente',
  execution_status:'referência não homologada',
  warning:'A escada do Projeto é decisão fechada. A escada de execução precisa ser validada contra obra real antes de entrar em proposta.'
 };
}

export const CHANNEL_RULES={
 outbound:'Airbnb, clínicas/escritórios e condomínios. Não usar a vertical silver como pedido padrão.',
 BNI:'Envelhecimento em casa. Airbnb é outbound; não misturar os canais.',
 proposal:'Mostrar sempre duas opções. Nunca A, B e C juntas na mesma página.',
 diagnosis:'45 minutos; sair com Projeto Executivo vendido ou apresentação de proposta agendada.',
 partner:'Lead indicado em 24h; comissão em até 7 dias; retorno de status em cada etapa.'
};
