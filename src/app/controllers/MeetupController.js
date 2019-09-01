import * as Yup from 'yup';
import { Op } from 'sequelize';
import { parseISO, isBefore, startOfDay, endOfDay } from 'date-fns';

import Meetup from '../models/Meetup';
import File from '../models/File';
import User from '../models/User';

class MeetupController {
  async index(req, res) {
    const page = req.query.page || 1;

    if (!req.query.date) {
      return req.status(400).json({ error: 'Invalid date' });
    }

    const seachDate = req.query.date;
    const parsedDate = parseISO(seachDate);

    const meetups = await Meetup.findAll({
      where: {
        date: { [Op.between]: [startOfDay(parsedDate), endOfDay(parsedDate)] },
      },
      attributes: ['past', 'id', 'title', 'description', 'location', 'date'],
      order: ['date'],
      limit: 10,
      offset: (page - 1) * 10,
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email'],
        },
        {
          model: File,
          as: 'banner',
          attributes: ['id', 'path', 'url'],
        },
      ],
    });

    return res.json(meetups);
  }

  async show(req, res) {
    const meetup = await Meetup.findByPk(req.params.id, {
      attributes: [
        'id',
        'title',
        'description',
        'date',
        'location',
        'past',
        'cancelable',
      ],
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email'],
        },
        {
          model: File,
          as: 'banner',
          attributes: ['id', 'path', 'url'],
        },
      ],
    });

    if (meetup.creator.id !== req.userId) {
      return res.status(401).json({
        error: 'You are not allowed to view this meetup',
      });
    }

    return res.json(meetup);
  }

  async store(req, res) {
    const schema = Yup.object().shape({
      title: Yup.string().required(),
      description: Yup.string().required(),
      date: Yup.date().required(),
      location: Yup.string().required(),
      banner_id: Yup.number().required(),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation fails' });
    }

    const hourStart = parseISO(req.body.date);

    if (isBefore(hourStart, new Date())) {
      return res.status(400).json({ error: 'Past dates are not allowed' });
    }

    const meetup = await Meetup.create({
      ...req.body,
      user_id: req.userId,
    });

    return res.json(meetup);
  }

  async delete(req, res) {
    const meetup = await Meetup.findByPk(req.params.id);

    if (meetup.user_id !== req.userId) {
      return res.status(401).json({
        error: 'You are not allowed to cancel this meetup',
      });
    }

    if (meetup.cancelable === false) {
      return res.status(401).json({
        error: 'You can only cancel meetups 5 hours in advance',
      });
    }

    await meetup.destroy();

    return res.send();
  }

  async update(req, res) {
    const schema = Yup.object().shape({
      title: Yup.string(),
      description: Yup.string(),
      date: Yup.date(),
      location: Yup.string(),
      banner_id: Yup.number(),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation fails' });
    }

    const meetup = await Meetup.findByPk(req.params.id);

    if (meetup.user_id !== req.userId) {
      return res.status(401).json({
        error: 'You are not allowed to edit this meetup',
      });
    }

    if (meetup.past === true) {
      return res
        .status(401)
        .json({ error: 'You cannot edit meetups that has already passed' });
    }

    if (isBefore(parseISO(req.body.date), new Date())) {
      return res.status(400).json({ error: 'Past dates are not allowed' });
    }

    const creator_id = meetup.user_id;

    await meetup.update(req.body);

    return res.json({
      meetup,
      creator_id,
    });
  }
}

export default new MeetupController();
