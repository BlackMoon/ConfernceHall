﻿using domain.Login.Command;
using domain.SysUser;
using host.Security.TokenProvider;
using Kit.Core.CQRS.Command;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using System;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Security.Principal;
using System.Text;
using System.Threading.Tasks;

namespace host
{
    public partial class Startup
    {
        private void ConfigureAuth(IApplicationBuilder app)
        {
            TokenProviderOptions tokenOptions = app.ApplicationServices.GetRequiredService<IOptions<TokenProviderOptions>>().Value;

            if (tokenOptions.TwoFactorAuth)
            {
                tokenOptions.TwoFactorAuthOptions.SecretKeyResolver = u =>
                {
                    byte[] key;
                    // todo валидация логина  
                    if (true)
                    {
                        key = new byte[tokenOptions.TwoFactorAuthOptions.KeySize / 4];
                        RandomNumberGenerator.Create().GetBytes(key);
                    }
                    return Task.FromResult(key);
                };
            }

            SymmetricSecurityKey signingKey = new SymmetricSecurityKey(Encoding.ASCII.GetBytes(tokenOptions.SecretPhrase));

            tokenOptions.SigningCredentials = new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256Signature);
            tokenOptions.IdentityResolver = async (u, p) =>
            {
                ClaimsIdentity identity = null;

                ICommandDispatcher commandDispatcher = app.ApplicationServices.GetRequiredService<ICommandDispatcher>();
                LoginCommandResult result = await commandDispatcher.DispatchAsync<LoginCommand, LoginCommandResult>(
                    new LoginCommand()
                    {
                        Password = p,
                        UserName = u
                    });

                if (result.Status == LoginStatus.Success)
                {
                    SysUser sysUser = result.SysUser;

                    Claim[] claims = sysUser != null ? 
                        new[] { new Claim(ClaimTypes.GivenName, sysUser.Name), new Claim(ClaimTypes.Role, sysUser.Role.ToString()) } :
                        null;

                    identity = new ClaimsIdentity(new GenericIdentity(u, "Token"), claims);
                }

                return await Task.FromResult(identity);
            };

            app.UseSimpleTokenProvider(tokenOptions);
            
            app.UseJwtBearerAuthentication(new JwtBearerOptions
            {
                AutomaticAuthenticate = true,
                AutomaticChallenge = true,
                Events = new JwtBearerEvents
                {
                    OnChallenge = ctx => Task.FromResult(0)            // prevent 404 status code instead of 401              
                },

                TokenValidationParameters = new TokenValidationParameters
                {
                    // The signing key must match!
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = signingKey,

                    // Validate the JWT Issuer (iss) claim
                    ValidateIssuer = true,
                    ValidIssuer = tokenOptions.Issuer,

                    // Validate the JWT Audience (aud) claim
                    ValidateAudience = true,
                    ValidAudience = tokenOptions.Audience,

                    // Validate the token expiry
                    ValidateLifetime = true,

                    // If you want to allow a certain amount of clock drift, set that here:
                    ClockSkew = TimeSpan.Zero
                }                
            });
        }
    }
}
