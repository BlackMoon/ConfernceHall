﻿using System.Collections.Concurrent;
using System.Diagnostics;
using System.Threading.Tasks;
using domain.Member;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;

namespace host.Hubs
{
    public interface IBroadcaster
    {
        /// <summary>
        /// Подтверждение регистрации участника
        /// </summary>
        /// <param name="member"></param>
        /// <returns></returns>
        Task ConfirmMember(Member member);

        /// <summary>
        /// Разрегистрировать участника
        /// </summary>
        /// <param name="id"></param>
        /// <returns></returns>
        Task UnregisterMember(int id);

        /// <summary>
        /// Отправить сообщения в бегущую строку
        /// </summary>
        /// <param name="tickers"></param>
        /// <returns></returns>
        Task SendTickers(string [] tickers);
    }


    /// <summary>
    /// SignalR hub
    /// </summary>
    public class Broadcaster : Hub<IBroadcaster>
    {
        private const string QueryKey = "id";

        private static readonly ConcurrentDictionary<string, int> GroupVolumes = new ConcurrentDictionary<string, int>();

        private ILogger<Broadcaster> _logger;

        public Broadcaster(ILogger<Broadcaster> logger)
        {
            _logger = logger;
        }

        /// <summary>
        /// Возвращает кол-во подключенных клиентов группы
        /// </summary>
        /// <param name="group"></param>
        /// <returns></returns>
        public static int GetVolume(string group)
        {
            int cnt;
            GroupVolumes.TryGetValue(group, out cnt);
            return cnt;
        }

        private void GroupAdd()
        {
            string confId = Context.QueryString[QueryKey];
            if (!string.IsNullOrEmpty(confId))
            {
                Groups.Add(Context.ConnectionId, confId);
                GroupVolumes.AddOrUpdate(confId, 1, (k, v) => v + 1);

                _logger.LogInformation("Added {0} to group {1}.", Context.ConnectionId, confId);
            }
        }

        public override Task OnConnected()
        {
            GroupAdd();
            return base.OnConnected();
        }

        public override Task OnReconnected()
        {
            GroupAdd();
            return base.OnReconnected();
        }

        public override Task OnDisconnected(bool stopCalled)
        {
            string confId = Context.QueryString[QueryKey];
            if (!string.IsNullOrEmpty(confId))
            {
                Groups.Remove(Context.ConnectionId, confId);

                int cnt;
                GroupVolumes.TryGetValue(confId, out cnt);

                if (cnt == 1)
                    // last client
                    GroupVolumes.TryRemove(confId, out cnt);
                else
                    // descrease count
                    GroupVolumes.TryUpdate(confId, cnt - 1, cnt);

                _logger.LogInformation("Removed {0} from group {1}", Context.ConnectionId, confId);
            }

            return base.OnDisconnected(stopCalled);
        }
    }
}
