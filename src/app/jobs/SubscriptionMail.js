import { format, parseISO } from 'date-fns';
import pt from 'date-fns/locale/pt';

import Mail from '../../lib/Mail';

class SubscriptionMail {
  get key() {
    return 'SubscriptionMail';
  }

  async handle({ data }) {
    const { meetup, user } = data;

    await Mail.sendMail({
      to: `${meetup.creator.name} <${meetup.creator.email}>`,
      subject: `[${meetup.title}] Nova inscrição`,
      template: 'subscription',
      context: {
        creator: meetup.creator.name,
        meetup: meetup.title,
        user: user.name,
        email: user.email,
        date: format(parseISO(meetup.date), "'dia' dd 'de' MMMM', às' H:mm'h", {
          locale: pt,
        }),
      },
    });
  }
}

export default new SubscriptionMail();
