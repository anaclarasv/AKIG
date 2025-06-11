-- Create monitoring forms tables for dynamic evaluation system

-- Monitoring Forms - Dynamic evaluation forms with sections and criteria
CREATE TABLE IF NOT EXISTS monitoring_forms (
  id SERIAL PRIMARY KEY,
  name VARCHAR NOT NULL,
  description TEXT,
  company_id INTEGER REFERENCES companies(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Form Sections - Groups of criteria within a form
CREATE TABLE IF NOT EXISTS form_sections (
  id SERIAL PRIMARY KEY,
  form_id INTEGER NOT NULL REFERENCES monitoring_forms(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Form Criteria - Individual evaluation criteria
CREATE TABLE IF NOT EXISTS form_criteria (
  id SERIAL PRIMARY KEY,
  section_id INTEGER NOT NULL REFERENCES form_sections(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  description TEXT,
  weight DECIMAL(5,2) NOT NULL, -- Weight/points for this criteria
  type VARCHAR NOT NULL, -- 'sim_nao_na', 'score', 'checkbox'
  is_required BOOLEAN DEFAULT true,
  is_critical_failure BOOLEAN DEFAULT false, -- "ZERA" criteria
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Monitoring Evaluations - Individual evaluations with dynamic criteria responses
CREATE TABLE IF NOT EXISTS monitoring_evaluations (
  id SERIAL PRIMARY KEY,
  monitoring_session_id INTEGER NOT NULL REFERENCES monitoring_sessions(id),
  form_id INTEGER NOT NULL REFERENCES monitoring_forms(id),
  evaluator_id VARCHAR NOT NULL REFERENCES users(id),
  partial_score DECIMAL(5,2) NOT NULL,
  final_score DECIMAL(5,2) NOT NULL,
  has_critical_failure BOOLEAN DEFAULT false,
  critical_failure_reason TEXT,
  observations TEXT,
  status VARCHAR NOT NULL DEFAULT 'draft', -- draft, completed, signed
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Evaluation Responses - Individual responses to form criteria
CREATE TABLE IF NOT EXISTS evaluation_responses (
  id SERIAL PRIMARY KEY,
  evaluation_id INTEGER NOT NULL REFERENCES monitoring_evaluations(id) ON DELETE CASCADE,
  criteria_id INTEGER NOT NULL REFERENCES form_criteria(id),
  response VARCHAR NOT NULL, -- 'sim', 'nao', 'na', score value, or 'checked'/'unchecked'
  points_earned DECIMAL(5,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default monitoring form with customer service criteria
INSERT INTO monitoring_forms (name, description, is_active) VALUES 
('Ficha de Monitoria Padrão', 'Formulário padrão para avaliação de atendimento ao cliente', true);

-- Get the form ID for the sections
INSERT INTO form_sections (form_id, name, description, order_index) VALUES 
(1, 'Abertura', 'Critérios de abertura do atendimento', 1),
(1, 'Investigação / Sondagem', 'Critérios de investigação e sondagem', 2),
(1, 'Tratamento', 'Critérios de tratamento do cliente', 3),
(1, 'Finalização', 'Critérios de finalização do atendimento', 4),
(1, 'Falhas Graves', 'Critérios que zeram a avaliação', 5);

-- Insert criteria for each section
-- Abertura (Section 1)
INSERT INTO form_criteria (section_id, name, description, weight, type, order_index) VALUES
(1, 'Saudação adequada', 'Utilizou saudação apropriada ao horário e canal', 5.00, 'sim_nao_na', 1),
(1, 'Identificação pessoal', 'Identificou-se adequadamente (nome/empresa)', 5.00, 'sim_nao_na', 2),
(1, 'Identificação do cliente', 'Solicitou identificação do cliente de forma cortês', 5.00, 'sim_nao_na', 3),
(1, 'Tom de voz adequado', 'Manteve tom de voz cordial e profissional', 5.00, 'sim_nao_na', 4);

-- Investigação / Sondagem (Section 2)
INSERT INTO form_criteria (section_id, name, description, weight, type, order_index) VALUES
(2, 'Escuta ativa', 'Demonstrou escuta ativa ao cliente', 10.00, 'sim_nao_na', 1),
(2, 'Perguntas assertivas', 'Realizou perguntas adequadas para entender a necessidade', 10.00, 'sim_nao_na', 2),
(2, 'Confirmação do entendimento', 'Confirmou o entendimento da solicitação', 5.00, 'sim_nao_na', 3),
(2, 'Paciência e empatia', 'Demonstrou paciência e empatia durante a investigação', 10.00, 'sim_nao_na', 4);

-- Tratamento (Section 3)
INSERT INTO form_criteria (section_id, name, description, weight, type, order_index) VALUES
(3, 'Ofereceu solução adequada', 'Apresentou solução apropriada ao problema', 15.00, 'sim_nao_na', 1),
(3, 'Explicação clara', 'Explicou procedimentos de forma clara e objetiva', 10.00, 'sim_nao_na', 2),
(3, 'Linguagem adequada', 'Utilizou linguagem apropriada ao perfil do cliente', 5.00, 'sim_nao_na', 3),
(3, 'Proatividade', 'Demonstrou proatividade na resolução', 10.00, 'sim_nao_na', 4);

-- Finalização (Section 4)
INSERT INTO form_criteria (section_id, name, description, weight, type, order_index) VALUES
(4, 'Confirmação da solução', 'Confirmou se a solução atendeu à necessidade', 5.00, 'sim_nao_na', 1),
(4, 'Ofereceu ajuda adicional', 'Perguntou se havia mais alguma dúvida', 5.00, 'sim_nao_na', 2),
(4, 'Agradecimento', 'Agradeceu o contato de forma cordial', 5.00, 'sim_nao_na', 3),
(4, 'Despedida adequada', 'Realizou despedida apropriada', 5.00, 'sim_nao_na', 4);

-- Falhas Graves (Section 5) - Critérios que zeram a avaliação
INSERT INTO form_criteria (section_id, name, description, weight, type, is_critical_failure, order_index) VALUES
(5, 'Informação incorreta', 'Forneceu informação incorreta ao cliente', 0.00, 'checkbox', true, 1),
(5, 'Tratamento inadequado', 'Tratou o cliente de forma inadequada ou desrespeitosa', 0.00, 'checkbox', true, 2),
(5, 'Não seguiu procedimento', 'Não seguiu procedimentos obrigatórios da empresa', 0.00, 'checkbox', true, 3),
(5, 'Quebra de sigilo', 'Quebrou sigilo de informações do cliente', 0.00, 'checkbox', true, 4);