import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';

const PAGE = 'dashboard-help';

export const getHelpFAQs = async (_req: Request, res: Response): Promise<void> => {
  const record = await prisma.contentSection.findUnique({
    where: { page_section_key: { page: PAGE, section: 'faq', key: 'list' } },
  });

  const faqs = (record?.data as any[])?.filter((item: any) => item.question && item.answer) ?? [];

  res.status(200).json({ success: true, data: faqs });
};

export const getHelpGuides = async (_req: Request, res: Response): Promise<void> => {
  const record = await prisma.contentSection.findUnique({
    where: { page_section_key: { page: PAGE, section: 'guides', key: 'list' } },
  });

  const guides = (record?.data as any[])?.filter((item: any) => item.id && item.title) ?? [];

  res.status(200).json({ success: true, data: guides });
};

export const getHelpTutorials = async (_req: Request, res: Response): Promise<void> => {
  const record = await prisma.contentSection.findUnique({
    where: { page_section_key: { page: PAGE, section: 'tutorials', key: 'list' } },
  });

  const tutorials = (record?.data as any[])?.filter((item: any) => item.id && item.title) ?? [];

  res.status(200).json({ success: true, data: tutorials });
};

export const getHelpContent = async (req: Request, res: Response): Promise<void> => {
  const { section } = req.params;

  if (!section || !['faq', 'guides', 'tutorials'].includes(section)) {
    throw new AppError('Invalid help section', 400);
  }

  const record = await prisma.contentSection.findUnique({
    where: { page_section_key: { page: PAGE, section, key: 'list' } },
  });

  const data = (record?.data as any[]) ?? [];

  res.status(200).json({ success: true, data });
};

export const getHelpSections = async (_req: Request, res: Response): Promise<void> => {
  const sections = await prisma.contentSection.findMany({
    where: { page: PAGE, isActive: true },
    orderBy: { order: 'asc' },
  });

  const result: Record<string, any[]> = {};
  for (const section of sections) {
    result[section.section] = (section.data as any[]) ?? [];
  }

  res.status(200).json({ success: true, data: result });
};

export const submitSupportRequest = async (req: Request, res: Response): Promise<void> => {
  const { category, message } = req.body;

  if (!category || !message || !message.trim()) {
    throw new AppError('Category and message are required', 400);
  }

  console.log('Support request received:', { category, message: message.trim() });

  res.status(201).json({ success: true, message: 'Support request submitted successfully' });
};
