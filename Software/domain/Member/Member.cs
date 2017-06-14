﻿using System;
using domain.Common;
using System.ComponentModel.DataAnnotations.Schema;
using Newtonsoft.Json;

namespace domain.Member
{
    public enum MemberState
    {
        /// <summary>
        /// Приглашен
        /// </summary>
        Invited,

        /// <summary>
        /// Зарегистрирован
        /// </summary>
        Registered,

        /// <summary>
        /// Регистрация подтверждена
        /// </summary>
        Confirmed
    };
   
    [Table("conf_hall.conf_members")]
    public class Member : KeyObject
    {
        public string Name { get; set; }

        /// <summary>
        /// Должность
        /// </summary>
        public string Position { get; set; }

        /// <summary>
        /// Организация
        /// </summary>
        public string Job { get; set; }

        /// <summary>
        /// Место
        /// </summary>
        public string Seat { get; set; }

        /// <summary>
        /// Статус
        /// </summary>
        [JsonProperty(DefaultValueHandling = DefaultValueHandling.Ignore)]
        public MemberState MemberState { get; set; }
        
        [JsonIgnore]
        public string State
        {
            set
            {
                MemberState memberState;
                Enum.TryParse(value, true, out memberState);
                MemberState = memberState;
            }
        }

    }
}
